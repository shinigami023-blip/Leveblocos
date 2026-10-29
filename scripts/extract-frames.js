// Gera a sequência de quadros do hero a partir do vídeo (requer ffmpeg no PATH).
// Uso: npm run frames — usa media/hero-hd.mp4 (versão ampliada) se existir, senão media/hero.mov.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const hd = path.join(root, 'media', 'hero-hd.mp4');
const src = fs.existsSync(hd) ? hd : path.join(root, 'media', 'hero.mov');
const out = path.join(root, 'public', 'frames');

if (!fs.existsSync(src)) {
  console.error('Vídeo não encontrado em media/');
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith('.webp')) fs.unlinkSync(path.join(out, f));

// Mesmas larguras de TIERS em public/js/hero.js.
const tiers = [
  { prefix: 'm', width: 1280, quality: 84 },
  { prefix: 'f', width: 1920, quality: 84 },
  { prefix: 'x', width: 2560, quality: 82 }
];

const run = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
for (const t of tiers) {
  run(['-i', src, '-vf', `fps=24,scale=${t.width}:-2:flags=lanczos`, '-c:v', 'libwebp', '-preset', 'photo',
    '-quality', String(t.quality), '-compression_level', '6', path.join(out, `${t.prefix}%03d.webp`)]);
  console.log(`quadros ${t.prefix} (${t.width}px) gerados`);
}
run(['-sseof', '-0.05', '-i', src, '-frames:v', '1', '-vf', 'scale=1920:-2:flags=lanczos', '-q:v', '2',
  path.join(root, 'public', 'img', 'casa-pronta.jpg')]);

const total = fs.readdirSync(out).filter((f) => f.startsWith('f')).length;
console.log(`${total} quadros por resolução. Confira FRAME_COUNT em public/js/hero.js.`);
