const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const dsccPath = path.join(repoRoot, 'cp-gantt/vendor/dscc.min.js');
let dsccSrc;
if (fs.existsSync(dsccPath)) dsccSrc = fs.readFileSync(dsccPath, 'utf8');
else { console.error('Cannot find dscc.min.js at', dsccPath); process.exit(1); }

const sideJsPath = path.join(repoRoot, 'side-viz/viz-codelab.js');
const outPath = path.join(repoRoot, 'side-viz/viz-codelab.bundle.js');
const sideSrc = fs.readFileSync(sideJsPath, 'utf8');

fs.writeFileSync(outPath, dsccSrc + '\n' + sideSrc);
console.log('Wrote', outPath);

