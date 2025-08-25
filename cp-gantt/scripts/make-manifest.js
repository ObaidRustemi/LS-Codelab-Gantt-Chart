import fs from 'fs';
import path from 'path';

const mode = process.argv[2]; // 'dev' or 'prod'
if (!mode || !['dev', 'prod'].includes(mode)) {
  console.error('Usage: node scripts/make-manifest.js <dev|prod>');
  process.exit(1);
}

const GS_BUCKET = process.env.GS_BUCKET || '';
const VERSION = process.env.VERSION || '';
const root = process.cwd();
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

const templatePath = path.join(root, mode === 'dev' ? 'manifest.json' : 'manifest.prod.json');
let template = fs.readFileSync(templatePath, 'utf8');

if (!GS_BUCKET) {
  console.error('GS_BUCKET env var is required');
  process.exit(1);
}

// For prod, rename the bundle to include VERSION and substitute both vars
if (mode === 'prod') {
  if (!VERSION) {
    console.error('VERSION env var is required for prod manifest');
    process.exit(1);
  }
  const src = path.join(distDir, 'cp-gantt.js');
  const dst = path.join(distDir, `cp-gantt.${VERSION}.js`);
  if (fs.existsSync(src)) fs.copyFileSync(src, dst);
  template = template.replaceAll('$VERSION', VERSION);
}

template = template.replaceAll('$GS_BUCKET', GS_BUCKET);
fs.writeFileSync(path.join(distDir, 'manifest.json'), template);
console.log(`Wrote dist/manifest.json for ${mode}`);

