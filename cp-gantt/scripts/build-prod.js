import { build } from 'esbuild';
import fs from 'fs';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: 'dist/cp-gantt.js'
});
const vendor = fs.readFileSync('vendor/dscc.min.js', 'utf8') + '\n' + fs.readFileSync('vendor/d3.v7.min.js', 'utf8') + '\n';
const app = fs.readFileSync('dist/cp-gantt.js', 'utf8');
fs.writeFileSync('dist/cp-gantt.js', vendor + app);
// Copy CSS and config for LS
fs.copyFileSync('styles.css', 'dist/viz-cp-gantt.css');
if (fs.existsSync('viz-cp-gantt.json')) {
  fs.copyFileSync('viz-cp-gantt.json', 'dist/viz-cp-gantt.json');
}
console.log('Built dist/cp-gantt.js and copied LS assets (prod).');
