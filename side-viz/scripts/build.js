import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const dsccPath = path.join(repoRoot, 'LS-Codelab-Gantt-Chart/cp-gantt/vendor/dscc.min.js');
const altDsccPath = path.join(repoRoot, 'cp-gantt/vendor/dscc.min.js');
let dsccSrc;
if (fs.existsSync(dsccPath)) dsccSrc = fs.readFileSync(dsccPath, 'utf8');
else if (fs.existsSync(altDsccPath)) dsccSrc = fs.readFileSync(altDsccPath, 'utf8');
else { console.error('Cannot find dscc.min.js'); process.exit(1); }

const sideJsPath = path.join(repoRoot, 'side-viz/viz-codelab.js');
const outPath = path.join(repoRoot, 'side-viz/viz-codelab.bundle.js');
const sideSrc = fs.readFileSync(sideJsPath, 'utf8');

fs.writeFileSync(outPath, dsccSrc + '\n' + sideSrc);
console.log('Wrote', outPath);
