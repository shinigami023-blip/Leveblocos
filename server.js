// Servidor do site Leve Blocos: arquivos estáticos + API de orçamento.
const path = require('path');
const fs = require('fs');
const express = require('express');

const PORT = Number(process.env.PORT) || 3000;
// Número completo ainda a confirmar com o cliente. Formato: 55DDDNUMERO (só dígitos).
const WHATSAPP = (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Bibliotecas servidas direto do node_modules (sem bundler).
const vendor = {
  'gsap.min.js': 'gsap/dist/gsap.min.js',
  'ScrollTrigger.min.js': 'gsap/dist/ScrollTrigger.min.js',
  'lenis.min.js': 'lenis/dist/lenis.min.js',
  'lenis.css': 'lenis/dist/lenis.css',
  'iconify-icon.min.js': 'iconify-icon/dist/iconify-icon.min.js'
};
app.get('/vendor/:file', (req, res) => {
  const rel = vendor[req.params.file];
  if (!rel) return res.sendStatus(404);
  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.sendFile(path.join(__dirname, 'node_modules', rel));
});

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders(res, file) {
    if (/\.(webp|jpg|png|woff2)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=2592000');
  }
}));

app.get('/api/config', (req, res) => {
  res.json({ whatsapp: WHATSAPP || null });
});

const INTERESSES = ['bloco', 'obra', 'modular', 'ficha', 'outro'];

function limpar(v, max) {
  return String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

app.post('/api/orcamento', (req, res) => {
  const b = req.body || {};
  if (b.site) return res.json({ ok: true }); // honeypot preenchido por robôs
  const lead = {
    nome: limpar(b.nome, 80),
    contato: limpar(b.contato, 80),
    cidade: limpar(b.cidade, 80),
    interesse: INTERESSES.includes(b.interesse) ? b.interesse : 'outro',
    area: limpar(b.area, 20),
    mensagem: limpar(b.mensagem, 1200)
  };
  const erros = {};
  if (lead.nome.length < 2) erros.nome = 'Informe seu nome.';
  if (lead.contato.length < 8) erros.contato = 'Informe um WhatsApp ou e-mail para retorno.';
  if (lead.cidade.length < 2) erros.cidade = 'Informe a cidade da obra.';
  if (Object.keys(erros).length) return res.status(422).json({ ok: false, erros });

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, 'leads.jsonl'),
      JSON.stringify({ ...lead, recebidoEm: new Date().toISOString() }) + '\n');
  } catch (err) {
    console.error('Falha ao gravar lead:', err);
    return res.status(500).json({ ok: false, mensagem: 'Não foi possível registrar agora. Tente pelo WhatsApp.' });
  }

  let whatsappUrl = null;
  if (WHATSAPP) {
    const texto = `Olá, Leve Blocos! Sou ${lead.nome}, de ${lead.cidade}. Tenho interesse em: ${lead.interesse}` +
      (lead.area ? ` (aprox. ${lead.area} m²)` : '') + (lead.mensagem ? `. ${lead.mensagem}` : '');
    whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  }
  res.json({ ok: true, whatsappUrl });
});

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => console.log(`Leve Blocos rodando em http://localhost:${PORT}`));
