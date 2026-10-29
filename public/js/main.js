/* Leve Blocos — movimento (GSAP + ScrollTrigger + Lenis) e interações da página. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var cleanups = [];

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------------- texto dividido em palavras ---------------- */
  // O conteúdo original fica num span .sr-only (nome acessível intacto);
  // a cópia dividida é decorativa e escondida de leitores de tela.
  function splitWords(el) {
    if (el.dataset.splitDone) return [];
    var words = [];
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    visual.className = 'split-line';

    function walk(src, dest) {
      src.childNodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { dest.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var inner = document.createElement('span');
            inner.textContent = part;
            w.appendChild(inner);
            dest.appendChild(w);
            words.push(inner);
          });
        } else if (node.nodeType === 1) {
          var clone = node.cloneNode(false);
          dest.appendChild(clone);
          walk(node, clone);
        }
      });
    }
    walk(el, visual);

    var sr = document.createElement('span');
    sr.className = 'sr-only';
    while (el.firstChild) sr.appendChild(el.firstChild);
    el.appendChild(sr);
    el.appendChild(visual);
    el.dataset.splitDone = '1';
    return words;
  }

  /* ---------------- navegação ---------------- */
  var nav = document.querySelector('[data-nav]');
  var menuBtn = document.querySelector('[data-menu-btn]');
  var menu = document.getElementById('menu');
  var lenis = null;

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.sr-only').textContent = open ? 'Fechar menu' : 'Abrir menu';
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });

  var lastY = 0;
  var waBtn = document.querySelector('[data-wa]');
  var heroEl = document.querySelector('[data-hero]');
  function onScrollUi(y) {
    // O botão só aparece depois que a casa termina de montar (o hero inclui o espaço do pin).
    var heroEnd = heroEl ? heroEl.offsetTop + heroEl.offsetHeight - window.innerHeight * 0.5 : window.innerHeight * 0.6;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 1.2 && !nav.classList.contains('is-open') && !nav.contains(document.activeElement));
    waBtn.classList.toggle('is-tucked', y < heroEnd);
    lastY = y;
  }

  /* ---------------- smooth scroll (Lenis, único motor) ---------------- */
  if (!reduced && window.Lenis && gsap && ST) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', function (e) { ST.update(); onScrollUi(e.scroll); });
    var tick = function (time) { lenis.raf(time * 1000); };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    cleanups.push(function () { gsap.ticker.remove(tick); lenis.destroy(); });
  } else {
    var onNativeScroll = function () { onScrollUi(window.scrollY); };
    window.addEventListener('scroll', onNativeScroll, { passive: true });
    cleanups.push(function () { window.removeEventListener('scroll', onNativeScroll); });
  }
  onScrollUi(window.scrollY);

  // Âncoras internas passam pelo Lenis e respeitam a altura do nav.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var target = id === '#topo' ? document.body : document.querySelector(id);
    if (!target) return;
    var interesse = a.getAttribute('data-interesse');
    if (interesse) selectInteresse(interesse);
    if (lenis) {
      e.preventDefault();
      lenis.scrollTo(id === '#topo' ? 0 : target, { offset: id === '#topo' ? 0 : -8, duration: 1.4 });
      history.replaceState(null, '', id);
    }
    if (id === '#orcamento') {
      setTimeout(function () { var f = document.getElementById('f-nome'); if (f) f.focus({ preventScroll: true }); }, lenis ? 1400 : 0);
    }
  });

  /* ---------------- hero ---------------- */
  if (gsap && ST) gsap.registerPlugin(ST);
  if (window.LeveHero) {
    cleanups.push(window.LeveHero.init({ reducedMotion: reduced || !gsap || !ST }));
  }

  /* ---------------- coreografia ---------------- */
  if (gsap && ST && !reduced) {
    gsap.registerPlugin(ST);

    // Intro do hero: nav e CTA já são utilizáveis desde o primeiro quadro.
    var heroTitle = document.querySelector('[data-hero-title]');
    var heroWords = heroTitle ? splitWords(heroTitle) : [];
    var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from(heroWords, { yPercent: 110, duration: 1.1, stagger: 0.06 }, 0.15)
      .from('[data-hero-in]', { y: 18, opacity: 0, duration: 0.9, stagger: 0.09 }, 0.45)
      .from('[data-meter]', { y: 20, opacity: 0, duration: 0.9 }, 0.9)
      // clearProps: transform residual no nav prenderia o menu mobile (position: fixed) dentro dele.
      .from(nav, { y: -20, opacity: 0, duration: 0.8, clearProps: 'transform,opacity' }, 0.1);

    // Títulos de seção, palavra por palavra.
    document.querySelectorAll('[data-split]:not([data-hero-title])').forEach(function (el) {
      var words = splitWords(el);
      gsap.from(words, {
        yPercent: 110, duration: 0.95, ease: 'power3.out', stagger: 0.045,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    // Texto e blocos de apoio entram depois dos títulos.
    gsap.set('[data-reveal]', { y: 28, opacity: 0 });
    ST.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: function (els) {
        gsap.to(els, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.15, overwrite: true });
      }
    });

    // Imagens: cortina de baixo para cima (a legenda, fora da foto, entra junto).
    document.querySelectorAll('[data-reveal-img]').forEach(function (fig) {
      gsap.fromTo(fig, { clipPath: 'inset(100% 0 0 0)' }, {
        clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power4.inOut',
        scrollTrigger: { trigger: fig, start: 'top 85%', once: true }
      });
    });

    // Parallax contido da foto do Modular.
    document.querySelectorAll('[data-parallax] img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Contadores.
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var end = Number(el.dataset.count);
      var obj = { v: 0 };
      el.textContent = '0';
      gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = Math.round(obj.v); }
      });
    });

    // Etapas: a que está no centro da tela fica em destaque.
    var steps = document.querySelector('[data-steps]');
    if (steps) {
      steps.classList.add('is-tracking');
      steps.querySelectorAll('.step').forEach(function (step, i, all) {
        ST.create({
          trigger: step, start: 'top 60%', end: 'bottom 60%',
          onToggle: function (self) {
            if (self.isActive) all.forEach(function (s) { s.classList.toggle('is-active', s === step); });
          }
        });
        if (i === 0) step.classList.add('is-active');
      });
    }

    // Medidas mudam depois que fontes e imagens carregam.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener('load', function () { ST.refresh(); });
    cleanups.push(function () { ST.getAll().forEach(function (t) { t.kill(); }); gsap.globalTimeline.clear(); });
  }

  /* ---------------- calculadora ---------------- */
  var calc = document.querySelector('[data-calc]');
  var calcOut = document.querySelector('[data-calc-out]');
  var areaAtual = 0;
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; }
  function calcular() {
    var f = calc.elements;
    var bruta = num(f.comp.value) * num(f.alt.value);
    var area = Math.max(0, bruta - Math.floor(num(f.portas.value)) * 1.7 - Math.floor(num(f.janelas.value)) * 1.4);
    areaAtual = Math.round(area * 10) / 10;
    calcOut.textContent = areaAtual ? areaAtual.toLocaleString('pt-BR') + ' m²' : '—';
  }
  if (calc) {
    calc.addEventListener('input', calcular);
    calcular();
    document.querySelector('[data-calc-use]').addEventListener('click', function () {
      var area = document.getElementById('f-area');
      area.value = areaAtual ? String(areaAtual).replace('.', ',') : '';
      var msg = document.getElementById('f-msg');
      if (areaAtual && !msg.value) msg.value = 'Calculei aprox. ' + areaAtual.toLocaleString('pt-BR') + ' m² de parede no site.';
      selectInteresse('bloco');
      var alvo = document.getElementById('orcamento');
      if (lenis) lenis.scrollTo(alvo, { offset: -8, duration: 1.4 }); else alvo.scrollIntoView();
      setTimeout(function () { document.getElementById('f-nome').focus({ preventScroll: true }); }, lenis ? 1400 : 0);
    });
  }

  function selectInteresse(v) {
    var r = document.querySelector('input[name="interesse"][value="' + v + '"]');
    if (r) r.checked = true;
  }

  /* ---------------- WhatsApp (número vem do servidor) ---------------- */
  var whatsapp = null;
  fetch('/api/config').then(function (r) { return r.ok ? r.json() : {}; }).then(function (cfg) {
    if (!cfg.whatsapp) return;
    whatsapp = cfg.whatsapp;
    waBtn.href = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent('Olá, Leve Blocos! Vim pelo site e quero um orçamento.');
    waBtn.target = '_blank';
    waBtn.rel = 'noopener';
    waBtn.querySelector('span').textContent = 'WhatsApp';
  }).catch(function () {});

  /* ---------------- formulário ---------------- */
  var form = document.querySelector('[data-form]');
  var statusEl = form.querySelector('[data-status]');
  var submit = form.querySelector('[data-submit]');

  function setErro(nome, msg) {
    var input = form.elements[nome];
    var err = document.getElementById('e-' + nome);
    if (!input || !err) return;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { input.setAttribute('aria-describedby', 'e-' + nome); err.textContent = msg; err.hidden = false; }
    else { input.removeAttribute('aria-describedby'); err.hidden = true; }
  }

  function validar() {
    var e = {};
    if (form.elements.nome.value.trim().length < 2) e.nome = 'Informe seu nome.';
    if (form.elements.contato.value.trim().length < 8) e.contato = 'Informe um WhatsApp ou e-mail para retorno.';
    if (form.elements.cidade.value.trim().length < 2) e.cidade = 'Informe a cidade da obra.';
    return e;
  }

  ['nome', 'contato', 'cidade'].forEach(function (n) {
    form.elements[n].addEventListener('blur', function () {
      if (form.elements[n].getAttribute('aria-invalid') === 'true' || form.elements[n].value) setErro(n, validar()[n]);
    });
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erros = validar();
    ['nome', 'contato', 'cidade'].forEach(function (n) { setErro(n, erros[n]); });
    var primeiro = Object.keys(erros)[0];
    if (primeiro) {
      statusEl.className = 'form-status erro';
      statusEl.textContent = 'Confira os campos destacados.';
      form.elements[primeiro].focus();
      return;
    }
    var dados = {};
    new FormData(form).forEach(function (v, k) { dados[k] = v; });
    submit.disabled = true;
    submit.classList.add('is-loading');
    statusEl.className = 'form-status';
    statusEl.textContent = 'Enviando…';

    fetch('/api/orcamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) {
          if (res.j && res.j.erros) Object.keys(res.j.erros).forEach(function (n) { setErro(n, res.j.erros[n]); });
          throw new Error((res.j && res.j.mensagem) || 'Confira os campos destacados.');
        }
        form.reset();
        selectInteresse('modular');
        statusEl.className = 'form-status ok';
        statusEl.textContent = 'Pedido recebido! Nossa equipe retorna em breve. ';
        if (res.j.whatsappUrl) {
          var a = document.createElement('a');
          a.href = res.j.whatsappUrl; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = 'Continuar no WhatsApp';
          statusEl.appendChild(a);
        }
      })
      .catch(function (err) {
        statusEl.className = 'form-status erro';
        statusEl.textContent = err.message && err.message !== 'Failed to fetch' ? err.message : 'Sem conexão. Tente de novo em instantes.';
      })
      .finally(function () {
        submit.disabled = false;
        submit.classList.remove('is-loading');
      });
  });

  window.addEventListener('pagehide', function (e) {
    if (e.persisted) return;
    cleanups.forEach(function (fn) { try { fn(); } catch (_) {} });
  });
})();
