# Site Leve Blocos

Site institucional em Node.js (Express) com hero em que a casa se monta conforme o scroll.

## Rodar

```bash
npm install
npm start            # http://localhost:3000
```

Variáveis de ambiente opcionais:

| Variável          | Para quê                                                        |
|-------------------|-----------------------------------------------------------------|
| `PORT`            | Porta do servidor (padrão 3000)                                 |
| `WHATSAPP_NUMBER` | Número completo, só dígitos com DDI (ex.: `5554996470000`). Ativa o botão fixo e o link pós-formulário. |
| `DATA_DIR`        | Pasta onde os pedidos de orçamento são gravados (`leads.jsonl`). Padrão: `./data` |

## Scripts

- `npm run build` — verificação de produção: quadros do hero, arquivos e referências.
- `npm run frames` — regenera a sequência do hero a partir de `media/hero.mov` (requer ffmpeg).

## Estrutura

- `server.js` — estáticos, `/vendor/*` (GSAP, Lenis, Iconify direto do node_modules), `GET /api/config`, `POST /api/orcamento`.
- `public/js/hero.js` — sequência de 121 quadros num canvas, guiada por ScrollTrigger (pin + scrub).
- `public/js/main.js` — Lenis (único motor de smooth scroll), revelações por palavra, etapas, calculadora, formulário.

## Origem das imagens

| Arquivo | Origem |
|---|---|
| `img/blocos-reais.jpg`, `img/blocos-detalhe.jpg` | Foto enviada pelo cliente (Blocos.png) |
| `frames/*`, `img/casa-pronta.jpg` | Vídeo enviado pelo cliente (Video para o Hero.mov), ampliado para 2560 px no Magnific Precision (`media/hero-hd.mp4`) — marcado como "animação ilustrativa". Quadros em 3 resoluções (m 1280, f 1920, x 2560); o hero escolhe a menor que cobre a tela. |
| `img/interior.webp`, `img/encaixe.webp`, `img/comercial.webp`, `img/chacara.webp` | Geradas no Magnific — marcadas como "imagem ilustrativa" no site |
| Ícones | Solar, via Iconify |

Substituir as imagens ilustrativas por fotos reais de obra assim que o cliente enviar.

## Pendências do briefing

- WhatsApp completo, e-mail e endereço da fábrica.
- Medidas, peso, cores e consumo por m² do bloco (a calculadora hoje entrega a área de parede, não a quantidade de blocos).
- Nomes, plantas, metragens e preços "a partir de" dos 3 modelos Modular.
- Laudos (compressão, fogo, térmico/acústico) e garantia — para virar prova ao lado de cada vantagem.
- Depoimentos autorizados (a seção foi omitida até haver depoimentos reais).
- Situação do CNPJ antes de publicá-lo no rodapé; domínio oficial.
- Ficha técnica em PDF (hoje o pedido entra pelo formulário).
