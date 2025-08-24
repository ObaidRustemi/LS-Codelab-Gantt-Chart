import { build } from 'esbuild';
import fs from 'fs';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: 'dist/viz.js'
});
const vendor = fs.readFileSync('vendor/dscc.min.js', 'utf8') + '\n' + fs.readFileSync('vendor/d3.v7.min.js', 'utf8') + '\n';
const app = fs.readFileSync('dist/viz.js', 'utf8');
fs.writeFileSync('dist/viz.js', vendor + app);
console.log('Built dist/viz.js (prod).');
