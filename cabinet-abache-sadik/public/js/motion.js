/* Cabinet Abache & Sadik — motion
   - Rolling counters styled like a court numbering stamp (numéroteur)
   - Scroll reveals for elements marked [data-reveal]
   - Pointer parallax on the hero arch and seal
   - Scroll drift for elements marked [data-parallax]
   Everything is skipped when the visitor prefers reduced motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (reduce || !('IntersectionObserver' in window)) { root.classList.add('motion-off'); return; }
  root.classList.add('motion-on');

  /* ---------- Rolling counters ---------- */
  function buildCounter(el) {
    var value = el.getAttribute('data-count');
    var prefix = el.getAttribute('data-prefix') || '';
    var html = '<span class="visually-hidden">' + prefix + value + '</span><span class="odo" aria-hidden="true">';
    if (prefix) html += '<span class="odo-fix">' + prefix + '</span>';
    value.split('').forEach(function (d) {
      var cells = '';
      for (var i = 0; i < 20; i++) cells += '<span>' + (i % 10) + '</span>';
      html += '<span class="odo-col"><span class="odo-strip" data-d="' + d + '">' + cells + '</span></span>';
    });
    el.innerHTML = html + '</span>';
  }
  function rollCounter(el, delay) {
    $$('.odo-strip', el).forEach(function (strip, i, all) {
      var d = +strip.getAttribute('data-d');
      // one full turn of the wheel, then settle on the digit; later wheels turn longer, like a stamp
      strip.style.transitionDuration = (1.6 + (all.length - i) * 0.35) + 's';
      strip.style.transitionDelay = (delay + i * 90) + 'ms';
      strip.style.transform = 'translateY(-' + (10 + d) * 5 + '%)';
    });
  }
  var counters = $$('[data-count]');
  counters.forEach(buildCounter);

  /* ---------- Reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add('in-view');
      $$('[data-count]', el).forEach(function (c, i) { rollCounter(c, 700 + i * 180); });
      io.unobserve(el);
    });
  }, { threshold: 0.28 });
  $$('[data-reveal]').forEach(function (el) { io.observe(el); });

  /* ---------- Section reveals: headings are drawn in from the right, blocks rise, lists arrive in turn ---------- */
  var mark = function (sel, cls) {
    $$(sel).forEach(function (el) { if (!el.hasAttribute('data-reveal')) el.classList.add(cls); });
  };
  mark('.section-title', 'rv-wipe');
  mark('.section-intro, .prose-block, .form-sheet, .map, .split-head > .text-link, .explorer, .page-hero p', 'rv-rise');
  mark('.values, .points, .latest, .faq, .partners, .contact-details, .svc-grid', 'rv-stagger');
  $$('.rv-stagger').forEach(function (list) {
    Array.prototype.forEach.call(list.children, function (child, i) { child.style.setProperty('--i', i); });
  });
  // a clipped heading has no visible area, so watch its parent and reveal the heading from there
  var io2 = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var targets = en.target.__reveal || [en.target];
      targets.forEach(function (t) { t.classList.add('in-view'); });
      io2.unobserve(en.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  $$('.rv-rise, .rv-stagger').forEach(function (el) { io2.observe(el); });
  $$('.rv-wipe').forEach(function (el) {
    var host = el.parentElement;
    (host.__reveal = host.__reveal || []).push(el);
    io2.observe(host);
  });
  // once a heading has been drawn in, drop the clip so Arabic marks above and below the line are never cut
  $$('.rv-wipe').forEach(function (el) {
    el.addEventListener('transitionend', function () { el.classList.add('rv-done'); }, { once: true });
  });

  /* ---------- Hero pointer parallax (mouse / trackpad only) ---------- */
  var hero = document.querySelector('.hero');
  if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var raf = 0, px = 0, py = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(function () {
        hero.style.setProperty('--px', px.toFixed(3));
        hero.style.setProperty('--py', py.toFixed(3));
        raf = 0;
      });
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--px', 0);
      hero.style.setProperty('--py', 0);
    });
  }

  /* ---------- Scroll drift ---------- */
  var drifting = $$('[data-parallax]');
  if (drifting.length) {
    var ticking = false;
    var update = function () {
      drifting.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.setProperty('--p', Math.max(-1.2, Math.min(1.2, p)).toFixed(3));
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
})();
