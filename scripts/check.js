// Verificação de produção: confere se todo arquivo local referenciado no HTML/CSS/JS existe
// e se a sequência do hero está completa.
const fs = require('fs');
const path = require('path');

const pub = path.join(__dirname, '..', 'public');
const falhas = [];

const heroJs = fs.readFileSync(path.join(pub, 'js', 'hero.js'), 'utf8');
const count = Number((heroJs.match(/FRAME_COUNT\s*=\s*(\d+)/) || [])[1]);
for (const prefix of ['m', 'f', 'x']) {
  for (let i = 1; i <= count; i++) {
    const nome = `${prefix}${String(i).padStart(3, '0')}.webp`;
    if (!fs.existsSync(path.join(pub, 'frames', nome))) falhas.push(`quadro ausente: frames/${nome}`);
  }
}

const arquivos = ['index.html', '404.html', 'css/style.css', 'js/main.js', 'js/hero.js'];
for (const arq of arquivos) {
  const p = path.join(pub, arq);
  if (!fs.existsSync(p)) { falhas.push(`arquivo ausente: ${arq}`); continue; }
  const txt = fs.readFileSync(p, 'utf8');
  const refs = [...txt.matchAll(/(?:src|href|url\()\s*=?\s*["']?(\/?(?:img|css|js|frames|vendor|fonts)\/[^"')\s]+)/g)].map((m) => m[1]);
  for (const ref of refs) {
    const limpo = ref.replace(/^\//, '').split(/[?#]/)[0];
    if (!fs.existsSync(path.join(pub, limpo))) {
      falhas.push(`${arq}: referência quebrada ${ref}`);
    }
  }
  if (/lorem ipsum|placeholder text/i.test(txt) || /\bTODO\b|\bFIXME\b/.test(txt)) falhas.push(`${arq}: contém texto provisório`);
}

if (falhas.length) {
  console.error('Falhas:\n- ' + falhas.join('\n- '));
  process.exit(1);
}
console.log(`OK — ${count} quadros x3, ${arquivos.length} arquivos e referências conferidos.`);
