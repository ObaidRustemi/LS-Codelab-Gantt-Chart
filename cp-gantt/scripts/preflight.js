import fs from 'fs';
import path from 'path';

const dist = 'dist';
const requiredFiles = [
  'cp-gantt.js',
  'viz-cp-gantt.css',
  'viz-cp-gantt.json',
  'manifest.json'
];

function fail(msg) { console.error(`Preflight: ${msg}`); process.exit(1); }

if (!fs.existsSync(dist)) fail('dist/ missing. Run build first.');

for (const f of requiredFiles) {
  const p = path.join(dist, f);
  if (!fs.existsSync(p)) fail(`${f} missing in dist/`);
  const sz = fs.statSync(p).size;
  if (sz <= 0) fail(`${f} is empty`);
}

// Basic manifest checks
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
if (!manifest.components || !Array.isArray(manifest.components) || manifest.components.length === 0) fail('manifest.components missing');
const res = manifest.components[0]?.resource || {};
if (!res.js || !res.config) fail('manifest.resource.js or .config missing');

// Basic config checks
const cfg = JSON.parse(fs.readFileSync(path.join(dist, 'viz-cp-gantt.json'), 'utf8'));
const dataIds = new Set((cfg.data?.[0]?.elements || []).map(e => e.id));
['team','projectName','cp3Date','cp35Date','cp4Date','cp5Date'].forEach(id => {
  if (!dataIds.has(id)) fail(`config missing data element: ${id}`);
});

console.log('Preflight: OK');

