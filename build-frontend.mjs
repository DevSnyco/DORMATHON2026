#!/usr/bin/env node
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'public', 'app.jsx')],
    outfile: path.join(__dirname, 'public', 'app.js'),
    bundle: true,
    format: 'iife',
    globalName: 'IRYSApp',
    sourcemap: false,
    minify: false,
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    loader: { '.jsx': 'jsx' },
    external: ['react', 'react-dom']
  });
  console.log('Built public/app.js');
}
main().catch((e) => { console.error(e); process.exit(1); });
