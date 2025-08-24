import { build } from 'esbuild';
import fs from 'fs';

const banner = `/* CP Gantt (dev build) */\n`;
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/viz.js',
  sourcemap: true,
  banner: { js: banner },
});

// Concatenate vendor libs before app code
const vendor = fs.readFileSync('vendor/dscc.min.js', 'utf8') + '\n' + fs.readFileSync('vendor/d3.v7.min.js', 'utf8') + '\n';
const app = fs.readFileSync('dist/viz.js', 'utf8');
fs.writeFileSync('dist/viz.js', vendor + app);
console.log('Built dist/viz.js (dev).');
