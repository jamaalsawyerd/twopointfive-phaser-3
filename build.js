const esbuild = require('esbuild');
const path = require('path');

async function main() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'phaser-game.ts')],
    bundle: true,
    format: 'iife',
    outfile: path.join(__dirname, 'dist', 'game.js'),
    globalName: 'TwoPointFiveGame',
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: false,
    sourcemap: true,
    target: ['es2016'],
    alias: { '~': path.join(__dirname, 'src') }
  }).catch(() => process.exit(1));
}

main();
