/* =====================================================================
   CONSTRUCCIONES IP — script.js
   - Todo es mejora progresiva: sin JavaScript (o si falla la CDN de anime.js) la página se ve completa.
   - Cada módulo va en su propio try/catch para que un error no rompa al resto.
   ===================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURACIÓN — el número de WhatsApp vive SOLO aquí.
     Formato: 52 + 10 dígitos. Si queda vacío, los botones y el envío
     a WhatsApp se ocultan con elegancia.
     ------------------------------------------------------------------ */
  const WHATSAPP_NUMBER = '525662688596';
  const DEFAULT_MESSAGE = 'Hola, quiero cotizar un proyecto con Construcciones IP.';

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = () => motionQuery.matches;
  const hasAnime = () => typeof window.anime === 'function';
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.warn('[IP] módulo omitido:', name, err); }
  };

  /* ---------- WhatsApp ---------- */
  const waDigits = String(WHATSAPP_NUMBER).replace(/\D/g, '');
  const hasWhatsApp = waDigits.length >= 10;
  const waUrl = (text) => `https://wa.me/${waDigits}?text=${encodeURIComponent(text || DEFAULT_MESSAGE)}`;

  function initWhatsApp() {
    $$('[data-wa]').forEach((a) => {
      if (hasWhatsApp) {
        a.setAttribute('href', waUrl(a.dataset.waText));
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      } else {
        a.hidden = true;
      }
    });
    if (!hasWhatsApp) {
      $$('[data-wa-only], [data-wa-submit]').forEach((el) => { el.hidden = true; });
      const note = $('#form-status');
      if (note) note.textContent = 'Por ahora el envío por WhatsApp no está disponible. Intenta más tarde.';
    }
  }

  /* ---------- Cargador (≤ 2.4 s, con respaldo en CSS) ---------- */
  function initLoader() {
    const loader = $('#loader');
    const finishReady = () => root.classList.add('is-ready');
    if (!loader) { finishReady(); return; }
    // Si el respaldo CSS ya lo ocultó (JS tardó en cargar), no lo volvemos a mostrar.
    if (window.getComputedStyle(loader).visibility === 'hidden') {
      loader.hidden = true; loader.style.display = 'none'; finishReady(); return;
    }
    loader.classList.add('is-managed'); // desactiva el respaldo CSS: ahora lo controla JS

    const pct = $('#loader-pct');
    const fill = $('#loader-fill');
    const road = $('.loader__road', loader);
    const DURATION = reduced() ? 500 : 1500;
    const start = performance.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      loader.classList.add('is-out');
      finishReady();
      window.setTimeout(() => { loader.hidden = true; loader.style.display = 'none'; }, 720);
    };
    const tick = (now) => {
      if (finished) return;
      const t = clamp((now - start) / DURATION);
      const e = 1 - Math.pow(1 - t, 3);
      if (pct) pct.textContent = String(Math.round(e * 100)).padStart(2, '0');
      if (fill) fill.style.transform = `scaleX(${e.toFixed(4)})`;
      if (road) road.style.setProperty('--p', e.toFixed(4));
      if (t < 1) requestAnimationFrame(tick); else finish();
    };
    requestAnimationFrame(tick);
    window.setTimeout(finish, 1700); // seguro por si el navegador pausa requestAnimationFrame
  }

  /* ---------- Partir texto en palabras ---------- */
  function splitWords(el) {
    if (!el || el.dataset.splitDone) return;
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.style.setProperty('--i', String(index++));
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains('w')) {
          walk(child);
        }
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    el.classList.add('is-split');
  }

  /* ---------- Revelar al hacer scroll ---------- */
  function initReveal() {
    $$('[data-split]').forEach(splitWords);
    $$('[data-stagger]').forEach((group) => {
      $$('[data-reveal]', group).forEach((el, i) => { if (!el.dataset.delay) el.style.setProperty('--d', `${i * 90}ms`); });
    });
    $$('[data-reveal][data-delay]').forEach((el) => el.style.setProperty('--d', `${el.dataset.delay}ms`));

    const targets = $$('[data-reveal], [data-split]');
    const show = (el) => {
      el.classList.add('is-in');
      if (hasAnime() && !reduced() && el.matches('.pillar, .why-card')) {
        const ico = $('.pillar__ico, .why-card__ico', el);
        if (ico) window.anime({ targets: ico, scale: [0.6, 1], rotate: [-14, 0], duration: 1100, easing: 'easeOutElastic(1, .6)', delay: 250 });
      }
    };
    if (!('IntersectionObserver' in window) || reduced()) { targets.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- Hero: título por palabras ---------- */
  function initHeroTitle() {
    const title = $('[data-split-hero]');
    if (title) splitWords(title);
  }

  /* ---------- Palabras rotativas ---------- */
  function initRotator() {
    const rot = $('#rot');
    if (!rot || reduced()) return;
    const words = (rot.dataset.words || '').split('|').filter(Boolean);
    const b = $('b', rot);
    if (words.length < 2 || !b) return;
    let i = 0;
    window.setInterval(() => {
      if (document.hidden) return;
      rot.classList.add('is-out');
      window.setTimeout(() => {
        i = (i + 1) % words.length;
        b.textContent = words[i];
        rot.classList.remove('is-out');
        rot.classList.add('is-pre');
        void rot.offsetWidth; // reflow
        rot.classList.remove('is-pre');
      }, 520);
    }, 2600);
  }

  /* ---------- Cintas (marquee): duplica el contenido para un bucle continuo ---------- */
  function initMarquee() {
    $$('[data-marquee]').forEach((track) => {
      const html = track.innerHTML;
      track.innerHTML = html + html + html + html;
    });
  }

  /* ---------- Motor de scroll con suavizado ("slow motion") ---------- */
  const engine = (() => {
    const fns = [];
    let queued = false;
    const run = () => {
      queued = false;
      let again = false;
      const vh = window.innerHeight;
      const sy = window.scrollY;
      for (const fn of fns) {
        try { if (fn(sy, vh)) again = true; } catch (err) { /* un módulo no debe frenar al resto */ }
      }
      if (again) request();
    };
    const request = () => { if (!queued) { queued = true; window.requestAnimationFrame(run); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return { add: (fn) => { fns.push(fn); request(); }, request };
  })();
  const ease = (cur, target, k = 0.12) => {
    const next = lerp(cur, target, k);
    return Math.abs(target - next) < 0.0006 ? target : next;
  };

  /* Barra de progreso + estado del encabezado */
  function initHeaderAndProgress() {
    const header = $('#header');
    const bar = $('#scroll-progress');
    engine.add((sy) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(sy / max).toFixed(4) : 0})`;
      if (header) header.classList.toggle('is-scrolled', sy > 24);
      return false;
    });
  }

  /* Hero: desplazamiento y desvanecido con el scroll */
  function initHeroScroll() {
    const hero = $('#inicio');
    if (!hero) return;
    engine.add((sy) => {
      const p = clamp(sy / (hero.offsetHeight * 0.9));
      hero.style.setProperty('--hp', p.toFixed(4));
      return false;
    });
  }

  /* Parallax suave de elementos marcados */
  function initParallax() {
    if (reduced()) return;
    const items = $$('[data-parallax]').map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0.08, cur: 0, host: el.parentElement }));
    const imgs = $$('[data-parallax-img]').map((ph) => ({ ph, img: $('img', ph), cur: 0 }));
    if (!items.length && !imgs.length) return;
    engine.add((sy, vh) => {
      let moving = false;
      items.forEach((it) => {
        const r = it.host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const target = (r.top + r.height / 2 - vh / 2) * it.speed;
        it.cur = ease(it.cur, target, 0.1);
        it.el.style.translate = `0 ${it.cur.toFixed(1)}px`;
        if (it.cur !== target) moving = true;
      });
      imgs.forEach((it) => {
        const r = it.ph.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200 || !it.img) return;
        const target = clamp((r.top + r.height / 2 - vh / 2) * -0.045, -34, 34);
        it.cur = ease(it.cur, target, 0.1);
        it.img.style.setProperty('--py', `${it.cur.toFixed(1)}px`);
        if (it.cur !== target) moving = true;
      });
      return moving;
    });
  }

  /* Texto que se "enciende" palabra por palabra al hacer scroll */
  function initScrubText() {
    const items = $$('[data-scrub]').map((el) => {
      const words = [];
      const walk = (node) => {
        Array.from(node.childNodes).forEach((child) => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const s = document.createElement('span');
              s.className = 'sw';
              s.textContent = part;
              words.push(s);
              frag.appendChild(s);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === 1) walk(child);
        });
      };
      walk(el);
      return { el, words, cur: 0, max: 0 };
    });
    if (!items.length) return;
    if (reduced()) { items.forEach((it) => it.words.forEach((w) => w.style.setProperty('--k', '1'))); return; }
    engine.add((sy, vh) => {
      let moving = false;
      items.forEach((it) => {
        const r = it.el.getBoundingClientRect();
        const raw = clamp((vh * 0.88 - r.top) / (vh * 0.46 + r.height));
        it.max = Math.max(it.max, raw); // una vez encendido, no se apaga
        it.cur = ease(it.cur, it.max, 0.1);
        const n = it.words.length;
        it.words.forEach((w, i) => w.style.setProperty('--k', clamp(it.cur * (n + 3) - i).toFixed(3)));
        if (it.cur !== it.max) moving = true;
      });
      return moving;
    });
  }

  /* Foto que se abre a pantalla completa */
  function initExpand() {
    const items = $$('[data-expand]').map((sec) => ({ sec, frame: $('[data-expand-frame]', sec), cur: 0 })).filter((it) => it.frame);
    if (!items.length) return;
    if (reduced()) { items.forEach((it) => it.frame.style.setProperty('--p', '1')); return; }
    engine.add((sy, vh) => {
      let moving = false;
      items.forEach((it) => {
        const r = it.frame.parentElement.getBoundingClientRect();
        const raw = clamp((vh * 0.96 - r.top) / (vh * 0.62));
        it.cur = ease(it.cur, raw, 0.12);
        it.frame.style.setProperty('--p', it.cur.toFixed(4));
        if (it.cur !== raw) moving = true;
      });
      return moving;
    });
  }

  /* Tarjetas del proceso que se apilan */
  function initStack() {
    const steps = $$('.step');
    if (steps.length < 2 || reduced()) return;
    engine.add(() => {
      steps.forEach((li, i) => {
        const card = li.firstElementChild;
        const next = steps[i + 1];
        if (!card) return;
        if (!next) { card.style.setProperty('--k', '0'); return; }
        const stickTop = parseFloat(getComputedStyle(li).top) || 90;
        const h = li.getBoundingClientRect().height;
        const dist = next.getBoundingClientRect().top - stickTop;
        const p = clamp(1 - (dist - 14) / (h * 0.9));
        card.style.setProperty('--k', p.toFixed(3));
      });
      return false;
    });
  }

  /* Palabra gigante del pie */
  function initFooterWord() {
    const word = $('[data-footer-word]');
    if (!word || reduced()) return;
    engine.add((sy, vh) => {
      const r = word.parentElement.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.8));
      word.style.setProperty('--fy', `${((1 - p) * 40).toFixed(1)}px`);
      return false;
    });
  }

  /* ---------- Contadores (anime.js si está disponible) ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const run = (el) => {
      const to = parseFloat(el.dataset.count);
      if (!Number.isFinite(to)) return;
      if (reduced()) { el.textContent = String(to); return; }
      el.textContent = '0';
      if (hasAnime()) {
        const o = { v: 0 };
        window.anime({ targets: o, v: to, round: 1, duration: 1900, easing: 'easeOutExpo', update: () => { el.textContent = String(o.v); } });
      } else {
        const t0 = performance.now();
        const step = (now) => {
          const t = clamp((now - t0) / 1600);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    };
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Red de infraestructura en el hero (canvas) ---------- */
  function initHeroNet() {
    const canvas = $('#hero-net');
    const hero = $('#inicio');
    if (!canvas || !hero || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 1, H = 1, nodes = [], pulses = [], edges = [];
    let rafId = 0, running = false, last = 0, inView = true;
    const mouse = { x: -9999, y: -9999, on: false };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((W * H) / 17000, 22, W < 700 ? 36 : 66));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: 1.1 + Math.random() * 1.6, hub: Math.random() < 0.16,
      }));
      pulses = [];
      render(16);
    };

    const render = (dt) => {
      ctx.clearRect(0, 0, W, H);
      const maxD = W < 700 ? 105 : 150;
      edges.length = 0;
      for (const n of nodes) {
        n.x += n.vx * dt * 0.06; n.y += n.vy * dt * 0.06;
        if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
        if (mouse.on) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
          if (d < 170 && d > 1) { n.x += (dx / d) * 0.35; n.y += (dy / d) * 0.35; }
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < maxD) {
            const k = 1 - d / maxD;
            edges.push([i, j]);
            ctx.strokeStyle = a.hub || b.hub ? `rgba(242,106,27,${(k * 0.55).toFixed(3)})` : `rgba(255,255,255,${(k * 0.2).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (mouse.on) {
          const d = Math.hypot(nodes[i].x - mouse.x, nodes[i].y - mouse.y);
          if (d < 150) {
            ctx.strokeStyle = `rgba(255,138,61,${((1 - d / 150) * 0.6).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.hub ? n.r + 1.2 : n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.hub ? 'rgba(255,138,61,.95)' : 'rgba(255,255,255,.55)';
        ctx.fill();
      }
      if (!reduced()) {
        if (edges.length && pulses.length < 12 && Math.random() < 0.05) {
          const e = edges[(Math.random() * edges.length) | 0];
          pulses.push({ a: e[0], b: e[1], t: 0, s: 0.0006 + Math.random() * 0.0009 });
        }
        pulses = pulses.filter((p) => p.t < 1);
        for (const p of pulses) {
          p.t += p.s * dt;
          const a = nodes[p.a], b = nodes[p.b];
          const x = lerp(a.x, b.x, p.t), y = lerp(a.y, b.y, p.t);
          const x0 = lerp(a.x, b.x, Math.max(0, p.t - 0.14)), y0 = lerp(a.y, b.y, Math.max(0, p.t - 0.14));
          const grad = ctx.createLinearGradient(x0, y0, x, y);
          grad.addColorStop(0, 'rgba(242,106,27,0)'); grad.addColorStop(1, 'rgba(255,170,100,.95)');
          ctx.strokeStyle = grad; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#FFD2A8'; ctx.shadowColor = '#F26A1B'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
        }
      }
    };

    const loop = (now) => {
      if (!running) return;
      const dt = Math.min(48, now - last || 16);
      last = now;
      render(dt);
      rafId = requestAnimationFrame(loop);
    };
    const start = () => { if (running || reduced() || !inView || document.hidden) return; running = true; last = performance.now(); rafId = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(rafId); };

    resize();
    let rt = 0;
    window.addEventListener('resize', () => { window.clearTimeout(rt); rt = window.setTimeout(() => { resize(); }, 180); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView) start(); else stop(); }, { threshold: 0.02 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    if (pointerQuery.matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      });
      hero.addEventListener('pointerleave', () => { mouse.on = false; });
    }
    start();
  }

  /* ---------- Parallax del hero con el puntero ---------- */
  function initHeroPointer() {
    if (!pointerQuery.matches || reduced()) return;
    const hero = $('#inicio');
    const hv = $('#hv');
    if (!hero || !hv) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    const loop = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      hv.style.setProperty('--mx', cx.toFixed(3));
      hv.style.setProperty('--my', cy.toFixed(3));
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) requestAnimationFrame(loop); else running = false;
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
  }

  /* ---------- Inclinación 3D, luz que sigue al cursor y botones magnéticos ---------- */
  function initPointerFx() {
    if (!pointerQuery.matches || reduced()) return;
    $$('[data-tilt]').forEach((el) => {
      const strong = el.matches('.why-card');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', `${((0.5 - py) * (strong ? 9 : 7)).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((px - 0.5) * (strong ? 11 : 9)).toFixed(2)}deg`);
        el.style.setProperty('--sx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--sy', `${(py * 100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Menú móvil ---------- */
  function initMenu() {
    const burger = $('#burger');
    const menu = $('#menu');
    if (!burger || !menu) return;
    menu.inert = true;
    const setOpen = (open) => {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
    };
    burger.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setOpen(false); burger.focus(); } });
    window.matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Enlace activo según la sección visible ---------- */
  function initActiveNav() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav a');
    const map = new Map();
    links.forEach((a) => { const id = a.getAttribute('href').slice(1); const sec = document.getElementById(id); if (sec) map.set(sec, a); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.classList.remove('is-active'));
          const a = map.get(en.target);
          if (a) a.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, sec) => io.observe(sec));
  }

  /* ---------- Visor de fotos ---------- */
  function initLightbox() {
    const tiles = $$('.g-tile');
    const lb = $('#lb');
    if (!tiles.length || !lb) return;
    const ph = $('#lb-ph');
    const img = $('#lb-img');
    const count = $('#lb-count');
    const text = $('#lb-text');
    const fig = $('.lb__fig', lb);
    const data = tiles.map((t) => {
      const im = $('img', t);
      const holder = $('.ph', t);
      const cls = Array.from(holder.classList).find((c) => /^c-/.test(c)) || 'c-hf';
      return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '', cap: t.dataset.cap || '', cls, w: im.getAttribute('width'), h: im.getAttribute('height') };
    });
    let idx = 0;
    let lastFocus = null;
    const show = (i) => {
      idx = (i + data.length) % data.length;
      const d = data[idx];
      ph.className = `ph lb__ph ${d.cls}`;
      img.src = d.src; img.alt = d.alt;
      if (d.w) img.width = Number(d.w);
      if (d.h) img.height = Number(d.h);
      count.textContent = `${idx + 1} / ${data.length}`;
      text.textContent = d.cap;
      [idx + 1, idx - 1].forEach((n) => { const p = new Image(); p.src = data[(n + data.length) % data.length].src; });
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      lb.hidden = false;
      root.classList.add('lb-open');
      show(i);
      requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
      const closeBtn = $('.lb__close', lb);
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('is-open');
      root.classList.remove('lb-open');
      window.setTimeout(() => { lb.hidden = true; }, 280);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    tiles.forEach((t, i) => t.addEventListener('click', () => open(i)));
    lb.addEventListener('click', (e) => {
      if (e.target.closest('[data-lb-close]')) close();
      else if (e.target.closest('[data-lb-prev]')) show(idx - 1);
      else if (e.target.closest('[data-lb-next]')) show(idx + 1);
      else if (e.target.closest('.lb__cta')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        const f = $$('button, a[href]', lb).filter((el) => !el.hidden && el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = 0, sy = 0, tracking = false;
    fig.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; tracking = true; });
    fig.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- Formulario → WhatsApp ---------- */
  function initForm() {
    const form = $('#form-contacto');
    if (!form) return;
    const status = $('#form-status');
    const setStatus = (msg, ok) => {
      if (!status) return;
      status.textContent = msg;
      status.classList.toggle('is-ok', Boolean(ok));
    };
    const fail = (field, msg) => {
      const wrap = field.closest('.field');
      if (wrap) { wrap.classList.add('is-invalid'); const err = $('.field__err', wrap); if (err) err.textContent = msg; }
    };
    const clear = () => $$('.field', form).forEach((f) => { f.classList.remove('is-invalid'); const err = $('.field__err', f); if (err) err.textContent = ''; });
    form.addEventListener('input', (e) => {
      const wrap = e.target.closest('.field');
      if (wrap) { wrap.classList.remove('is-invalid'); const err = $('.field__err', wrap); if (err) err.textContent = ''; }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clear();
      const nombre = form.elements.nombre.value.trim();
      const servicio = form.elements.servicio.value.trim();
      const telefono = form.elements.telefono.value.trim();
      const lugar = form.elements.lugar.value.trim();
      const mensaje = form.elements.mensaje.value.trim();
      let bad = null;
      if (nombre.length < 2) { fail(form.elements.nombre, 'Escribe tu nombre para saludarte.'); bad = bad || form.elements.nombre; }
      if (!servicio) { fail(form.elements.servicio, 'Elige el servicio que necesitas.'); bad = bad || form.elements.servicio; }
      if (bad) { bad.focus(); setStatus('Revisa los campos marcados para continuar.', false); return; }
      if (!hasWhatsApp) { setStatus('Por ahora el envío por WhatsApp no está disponible.', false); return; }
      const lines = [`Hola, soy ${nombre}. Quiero cotizar: ${servicio}.`];
      if (lugar) lines.push(`La obra está en: ${lugar}.`);
      if (mensaje) lines.push(`Detalles: ${mensaje}`);
      if (telefono) lines.push(`Mi teléfono: ${telefono}`);
      const url = waUrl(lines.join('\n'));
      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url;
      setStatus('¡Listo! Se abrió WhatsApp con tu mensaje. Solo falta enviarlo.', true);
    });
  }

  /* ---------- Botón flotante: aviso amable ---------- */
  function initWaTip() {
    const wa = $('.wa-float');
    if (!wa || !hasWhatsApp || reduced()) return;
    window.setTimeout(() => {
      wa.classList.add('is-tip');
      window.setTimeout(() => wa.classList.remove('is-tip'), 5200);
    }, 7000);
  }

  /* ---------- Arranque ---------- */
  function boot() {
    root.classList.add('js-ready'); // desactiva la red de seguridad CSS: ahora JS controla las animaciones
    safe('whatsapp', initWhatsApp);
    safe('loader', initLoader);
    safe('hero-title', initHeroTitle);
    safe('reveal', initReveal);
    safe('rotator', initRotator);
    safe('marquee', initMarquee);
    safe('header', initHeaderAndProgress);
    safe('hero-scroll', initHeroScroll);
    safe('parallax', initParallax);
    safe('scrub', initScrubText);
    safe('expand', initExpand);
    safe('stack', initStack);
    safe('footer-word', initFooterWord);
    safe('counters', initCounters);
    safe('hero-net', initHeroNet);
    safe('hero-pointer', initHeroPointer);
    safe('pointer-fx', initPointerFx);
    safe('menu', initMenu);
    safe('active-nav', initActiveNav);
    safe('lightbox', initLightbox);
    safe('form', initForm);
    safe('wa-tip', initWaTip);
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
