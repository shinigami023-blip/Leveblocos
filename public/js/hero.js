/* Hero: a casa se monta conforme o scroll.
   Sequência de quadros extraída do vídeo (scripts/extract-frames.js) desenhada num canvas.
   Sem JS, sem canvas ou com movimento reduzido: fica a imagem da casa pronta (poster). */
(function () {
  'use strict';

  var FRAME_COUNT = 121;
  var FRAME_RATIO = 16 / 9;
  // Larguras geradas por scripts/extract-frames.js, da menor para a maior.
  var TIERS = [{ prefix: 'm', width: 1280 }, { prefix: 'f', width: 1920 }, { prefix: 'x', width: 2560 }];
  // Faixas de progresso de cada etapa do medidor (Base, Estrutura, Paredes, Acabamento).
  var STAGES = [0, 0.22, 0.48, 0.78];

  window.LeveHero = { init: init };

  function init(opts) {
    var hero = document.querySelector('[data-hero]');
    var canvas = hero && hero.querySelector('[data-hero-canvas]');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!hero || !ctx || opts.reducedMotion || !window.ScrollTrigger) {
      if (hero) hero.classList.add('is-static');
      return function () {};
    }

    var gsap = window.gsap;
    var mobile = window.matchMedia('(max-width: 760px)').matches;
    var dprCap = 2;
    var prefix = pickTier();
    // Fração do excedente cortada à esquerda: no desktop a casa fica à direita, longe do título.
    var focusX = mobile ? 0.72 : 0.08;
    var frames = new Array(FRAME_COUNT);
    var loaded = new Array(FRAME_COUNT);
    var current = -1;
    var wanted = 0;
    var disposed = false;
    var raf = 0;

    var pctEl = hero.querySelector('[data-meter-pct]');
    var barEl = hero.querySelector('[data-meter-bar]');
    var stageEls = hero.querySelectorAll('[data-stage]');
    var hint = hero.querySelector('[data-scroll-hint]');

    // Menor resolução que cobre o canvas (em pixels reais) no modo "cover".
    function pickTier() {
      var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      var need = Math.max(window.innerWidth, window.innerHeight * FRAME_RATIO) * dpr;
      for (var t = 0; t < TIERS.length; t++) if (TIERS[t].width >= need * 0.9) return TIERS[t].prefix;
      return TIERS[TIERS.length - 1].prefix;
    }

    function src(i) {
      return '/frames/' + prefix + String(i + 1).padStart(3, '0') + '.webp';
    }

    function load(i) {
      if (frames[i]) return frames[i].promise;
      var img = new Image();
      img.decoding = 'async';
      var p = new Promise(function (resolve) {
        img.onload = function () { loaded[i] = true; resolve(); if (i === wanted || current < 0) schedule(); };
        img.onerror = function () { resolve(); };
      });
      img.src = src(i);
      frames[i] = { img: img, promise: p };
      return p;
    }

    // Prioridade: primeiro quadro, depois um a cada 8 (o scrub já fica fluido),
    // depois o restante em segundo plano, poucos de cada vez.
    function preload() {
      var order = [];
      for (var s = 8; s >= 1; s = s / 2) {
        for (var i = 0; i < FRAME_COUNT; i += s) if (order.indexOf(i) < 0) order.push(i);
        if (s === 1) break;
      }
      if (order.indexOf(FRAME_COUNT - 1) < 0) order.push(FRAME_COUNT - 1);
      var next = 0;
      function pump() {
        if (disposed || next >= order.length) return;
        var batch = order.slice(next, next + 6);
        next += 6;
        Promise.all(batch.map(load)).then(pump);
      }
      load(0).then(function () {
        if (disposed) return;
        hero.classList.add('is-live');
        pump();
      });
    }

    function nearestLoaded(i) {
      if (loaded[i]) return i;
      for (var d = 1; d < FRAME_COUNT; d++) {
        if (i - d >= 0 && loaded[i - d]) return i - d;
        if (i + d < FRAME_COUNT && loaded[i + d]) return i + d;
      }
      return -1;
    }

    var cw = 0, ch = 0;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      var r = canvas.getBoundingClientRect();
      cw = Math.round(r.width * dpr);
      ch = Math.round(r.height * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      current = -1;
      schedule();
    }

    function draw() {
      raf = 0;
      var i = nearestLoaded(wanted);
      if (i < 0 || i === current) return;
      var img = frames[i].img;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var scale = Math.max(cw / iw, ch / ih);
      var dw = iw * scale, dh = ih * scale;
      var dx = (cw - dw) * focusX;
      var dy = (ch - dh) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, dx, dy, dw, dh);
      current = i;
    }

    function schedule() {
      if (!raf && !disposed) raf = requestAnimationFrame(draw);
    }

    function setProgress(p) {
      wanted = Math.min(FRAME_COUNT - 1, Math.round(p * (FRAME_COUNT - 1)));
      schedule();
      if (pctEl) pctEl.textContent = Math.round(p * 100);
      if (barEl) barEl.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      for (var s = 0; s < stageEls.length; s++) {
        stageEls[s].classList.toggle('is-on', p >= STAGES[s] + 0.01 || (s === 0 && p > 0));
      }
      if (hint) hint.style.opacity = p > 0.04 ? 0 : 1;
    }

    resize();
    preload();
    setProgress(0);

    var stage = hero.querySelector('.hero-stage');
    var st = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * (mobile ? 1.8 : 2.4)); },
      pin: stage,
      pinSpacing: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) { setProgress(self.progress); }
    });

    // O texto recua levemente enquanto a casa sobe, sem nunca sair de cena.
    var copyTween = gsap.to(hero.querySelector('.hero-copy'), {
      yPercent: -6,
      opacity: 0.88,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: function () { return '+=' + (st.end - st.start); }, scrub: true }
    });

    var onResize = debounce(function () { resize(); }, 150);
    window.addEventListener('resize', onResize);

    function onContextLost() { hero.classList.remove('is-live'); }
    canvas.addEventListener('contextlost', onContextLost);

    return function dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('contextlost', onContextLost);
      st.kill();
      if (copyTween.scrollTrigger) copyTween.scrollTrigger.kill();
      copyTween.kill();
      for (var i = 0; i < frames.length; i++) if (frames[i]) frames[i].img.src = '';
    };
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
})();
