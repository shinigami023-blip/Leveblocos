// Copia as bibliotecas do node_modules para public/vendor, servidas como arquivos estáticos.
// Roda no build (Vercel e local); os arquivos também ficam no repositório para hospedagem sem build.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'vendor');

const files = {
  'gsap.min.js': 'gsap/dist/gsap.min.js',
  'ScrollTrigger.min.js': 'gsap/dist/ScrollTrigger.min.js',
  'lenis.min.js': 'lenis/dist/lenis.min.js',
  'lenis.css': 'lenis/dist/lenis.css',
  'iconify-icon.min.js': 'iconify-icon/dist/iconify-icon.min.js'
};

fs.mkdirSync(out, { recursive: true });
for (const [name, rel] of Object.entries(files)) {
  const src = path.join(root, 'node_modules', rel);
  if (!fs.existsSync(src)) {
    console.error(`Não encontrado: node_modules/${rel} — rode npm install.`);
    process.exit(1);
  }
  // Remove o comentário de source map: o .map não é copiado.
  const txt = fs.readFileSync(src, 'utf8').replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, '\n');
  fs.writeFileSync(path.join(out, name), txt);
}
console.log(`${Object.keys(files).length} bibliotecas copiadas para public/vendor.`);
