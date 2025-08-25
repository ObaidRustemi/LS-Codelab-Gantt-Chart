import { build } from 'esbuild';
import fs from 'fs';

const banner = `/* CP Gantt (dev build) */\n`;
await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/cp-gantt.js',
  sourcemap: true,
  banner: { js: banner },
});

// Concatenate vendor libs before app code
const vendor = fs.readFileSync('vendor/dscc.min.js', 'utf8') + '\n' + fs.readFileSync('vendor/d3.v7.min.js', 'utf8') + '\n';
const app = fs.readFileSync('dist/cp-gantt.js', 'utf8');
fs.writeFileSync('dist/cp-gantt.js', vendor + app);
fs.copyFileSync('styles.css', 'dist/viz-cp-gantt.css');
if (fs.existsSync('viz-cp-gantt.json')) {
  fs.copyFileSync('viz-cp-gantt.json', 'dist/viz-cp-gantt.json');
}
console.log('Built dist/cp-gantt.js and copied LS assets (dev).');
