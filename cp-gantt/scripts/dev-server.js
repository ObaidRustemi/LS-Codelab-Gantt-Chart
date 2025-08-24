import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import { build } from 'esbuild';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

async function buildOnce() {
  await build({ entryPoints: [path.join(root, 'src/index.js')], outfile: path.join(root, 'dist/viz.js'), bundle: true, format: 'iife', sourcemap: true });
  const vendor = fs.readFileSync(path.join(root, 'vendor/dscc.min.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'vendor/d3.v7.min.js'), 'utf8') + '\n';
  const app = fs.readFileSync(path.join(root, 'dist/viz.js'), 'utf8');
  fs.writeFileSync(path.join(root, 'dist/viz.js'), vendor + app);
}

await buildOnce();

const serve = sirv(root, { dev: true });
const server = http.createServer((req, res) => serve(req, res));
server.listen(5173, () => console.log('Dev server at http://localhost:5173 (LOCAL mode).'));

chokidar.watch(path.join(root, 'src')).on('all', async () => {
  await buildOnce();
  console.log('Rebuilt.');
});
