## CP Gantt – Rollout Plan (Looker Studio Community Visualization)

This document describes how we package, host, and publish the CP Gantt visualization for Looker Studio (LS). It covers dev and prod flows, bucket layout, manifests, commands, and acceptance checks.

References:
- Defining the visualization config: https://developers.google.com/looker-studio/visualization/define-config
- Writing/bundling/manifest: https://developers.google.com/looker-studio/visualization/write-viz

### Repo outputs (from dist/)
- cp-gantt.js — single bundled JS (includes dscc helper, d3, our code)
- viz-cp-gantt.json — LS visualization config (data/style/interactions/features)
- viz-cp-gantt.css — stylesheet
- manifest.json — LS manifest (dev or prod variant)

Why: LS loads one JS file via a manifest; config surfaces data/style controls; CSS provides styling outside the bundle when desired.

### Google Cloud Storage (GCS) layout (bucket: ls-code-lab)
- Dev (iterative): gs://ls-code-lab/cp-gantt/dev/
- Prod (versioned): gs://ls-code-lab/cp-gantt/vN/ (v1, v2, …)

Why: a stable dev path lets us overwrite artifacts without changing the manifest; versioned prod paths keep releases immutable and cache-friendly.

### Manifests (gs:// URLs)
Dev (devMode: true)
```
{ "name": "CP Gantt", "logoUrl": "https://storage.googleapis.com/ls-code-lab/cp-gantt/assets/icon.png", "organization": "Your Org", "organizationUrl": "https://your-url", "termsOfServiceUrl": "https://your-url/terms", "supportUrl": "https://your-url/support", "packageUrl": "https://your-url", "privacyPolicyUrl": "https://your-url/privacy", "description": "Calendar Gantt with panning, keyboard, milestones", "devMode": true, "components": [ { "id": "cpGantt", "name": "CP Gantt", "iconUrl": "https://storage.googleapis.com/ls-code-lab/cp-gantt/assets/icon.png", "description": "Engineering schedule Gantt", "resource": { "js": "gs://ls-code-lab/cp-gantt/dev/cp-gantt.js", "config": "gs://ls-code-lab/cp-gantt/dev/viz-cp-gantt.json", "css": "gs://ls-code-lab/cp-gantt/dev/viz-cp-gantt.css" } } ] }
```

Prod (devMode: false; example v1)
```
{ "name": "CP Gantt", "logoUrl": "https://storage.googleapis.com/ls-code-lab/cp-gantt/assets/icon.png", "organization": "Your Org", "organizationUrl": "https://your-url", "termsOfServiceUrl": "https://your-url/terms", "supportUrl": "https://your-url/support", "packageUrl": "https://your-url", "privacyPolicyUrl": "https://your-url/privacy", "description": "Calendar Gantt with panning, keyboard, milestones", "devMode": false, "components": [ { "id": "cpGantt", "name": "CP Gantt", "iconUrl": "https://storage.googleapis.com/ls-code-lab/cp-gantt/assets/icon.png", "description": "Engineering schedule Gantt", "resource": { "js": "gs://ls-code-lab/cp-gantt/v1/cp-gantt.v1.js", "config": "gs://ls-code-lab/cp-gantt/v1/viz-cp-gantt.json", "css": "gs://ls-code-lab/cp-gantt/v1/viz-cp-gantt.css" } } ] }
```

Why: devMode true minimizes caching during iteration; devMode false speeds up production loads. gs:// URLs follow Google’s examples and work directly with LS.

### One-time bucket IAM (public read)
```
gsutil iam ch allUsers:objectViewer gs://ls-code-lab
```

Why: LS must fetch resources anonymously over the public internet; objectViewer makes files world-readable without exposing write access.

### Preflight sanity checks (run before uploading)
What to verify
- Build artifacts exist and are non-empty: `dist/cp-gantt.js`, `dist/viz-cp-gantt.json`, `dist/viz-cp-gantt.css`, `dist/manifest.json`.
- Manifest structure: has `components[0].resource.js/config` and uses gs:// paths matching the target.
- Config structure: contains required data element IDs `team`, `projectName`, `cp3Date`, `cp35Date`, `cp4Date`, `cp5Date`.

Command (from `cp-gantt/`)
```
npm run build:dev   # or build:prod
npm run predeploy:check
```

Why: catches missing files, mis-wired manifest/config, and prevents broken uploads.

### Dev deploy (no manifest edits after first use)
```
# Upload manifest + assets
gsutil -m cp -a public-read manifest.json gs://ls-code-lab/cp-gantt/dev/
gsutil -m cp -a public-read cp-gantt.js viz-cp-gantt.json viz-cp-gantt.css gs://ls-code-lab/cp-gantt/dev/

# Disable caching for dev
gsutil -m setmeta -h "Cache-Control:no-cache, max-age=0" gs://ls-code-lab/cp-gantt/dev/**

# Paste this in Looker Studio → Build your own
gs://ls-code-lab/cp-gantt/dev/manifest.json
```

Why: public-read exposes artifacts; no-cache ensures edits are immediately visible in LS without changing the manifest.

### Prod deploy (versioned; long cache)
```
export VERSION=v1

# Upload manifest + assets to new version
gsutil -m cp -a public-read manifest.json gs://ls-code-lab/cp-gantt/$VERSION/
gsutil -m cp -a public-read cp-gantt.$VERSION.js viz-cp-gantt.json viz-cp-gantt.css gs://ls-code-lab/cp-gantt/$VERSION/

# Enable long cache for prod
gsutil -m setmeta -h "Cache-Control:public, max-age=86400, immutable" gs://ls-code-lab/cp-gantt/$VERSION/**

# Manifest URL to paste/share
gs://ls-code-lab/cp-gantt/$VERSION/manifest.json
```

Why: versioning preserves reproducible builds; long-lived caching keeps reports fast and reduces egress.

Optional: keep a stable prod manifest at gs://ls-code-lab/cp-gantt/prod/manifest.json and update its resource URLs from vN → vN+1 per release.

Why: teams can paste one URL once; you can promote new versions by updating only the prod manifest.

### Config JSON (IDs we expect in LS)
Data elements
- team (DIMENSION DEFAULT, min 1 max 1)
- projectName (DIMENSION DEFAULT, min 1 max 1)
- cp3Date (DIMENSION TIME, min 1 max 1)
- cp35Date (DIMENSION TIME, min 0 max 1)
- cp4Date (DIMENSION TIME, min 0 max 1)
- cp5Date (DIMENSION TIME, min 0 max 1)

Style elements (subset)
- rowHeight NUMBER (default 28)
- showToday CHECKBOX (default true)
- todayLineColor COLOR (default #f23a2d)
- todayLineWidth NUMBER (default 3)
- showMilestoneTicks CHECKBOX (default true)
- monthLabelSize FONT_SIZE (default 16)
- monthLabelColor COLOR (default #f59e0b)
- monthGlow CHECKBOX (default true)
- enableDrag/enableWheel/keyboardAccel CHECKBOX (default true)

Why: these IDs map directly to our code’s `objectData.style.appearance` and field ingestion, ensuring LS controls drive the same behavior we use locally.

### Acceptance checks
- Manifest loads in Looker Studio; fields appear and map correctly.
- Dev manifest fetches latest code after upload (no manual manifest edits).
- Prod manifest is stable; version bumps create new URLs; caching is long.
- Visualization behavior matches local: panning/keyboard, year clamp, clip-path, month labels, Today line.

Why: validates the full path from hosting to runtime behaviors and avoids regressions in LS.

### Next actions
1) Add build step to emit `dist/` with: cp-gantt.js, viz-cp-gantt.json, viz-cp-gantt.css, manifest.json.
2) Add npm scripts: deploy:dev, deploy:prod.
3) Upload to `gs://ls-code-lab/cp-gantt/dev/` and validate in LS.
4) Cut `v1` and share the prod manifest URL.


