/* Cabinet Abache & Sadik — shared behaviour (all pages) */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var WA_NUMBER = '212661508837';
  var FORM_ENDPOINT = 'https://formspree.io/f/mreozqnp';

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Logo fallback: hide a missing image, keep the wordmark ---------- */
  $$('img[data-logo]').forEach(function (img) {
    function hide() { img.style.display = 'none'; }
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
  });

  /* ---------- Partner portraits: fall back to the arch pattern ---------- */
  $$('.arch-frame img').forEach(function (img) {
    function empty() { img.style.display = 'none'; }
    if (img.complete && img.naturalWidth === 0) empty();
    img.addEventListener('error', empty);
  });

  /* ---------- Header shadow on scroll ---------- */
  var header = $('.site-header');
  var hasReading = !!$('.read-progress');  // articles keep their own reading bar
  var ticking = false;
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (!hasReading) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Mega menus: close after a choice, or on Escape ---------- */
  $$('.has-mega').forEach(function (li) {
    $$('.mega a', li).forEach(function (a) {
      a.addEventListener('click', function () {
        li.classList.add('is-suppressed');
        if (document.activeElement) document.activeElement.blur();
      });
    });
    li.addEventListener('mouseleave', function () { li.classList.remove('is-suppressed'); });
    li.addEventListener('focusin', function () { li.classList.remove('is-suppressed'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.activeElement && document.activeElement.closest && document.activeElement.closest('.has-mega');
    if (open) { var trigger = open.querySelector('a'); open.classList.add('is-suppressed'); if (trigger) trigger.focus(); }
  });

  /* ---------- Scrollspy: underline the section in view (home page) ---------- */
  var spyLinks = $$('.main-nav > ul > li > a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    spyLinks.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (document.getElementById(id)) byId[id] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        spyLinks.forEach(function (a) { a.classList.remove('is-active'); });
        if (byId[en.target.id]) byId[en.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- Mobile drawer ---------- */
  var toggle = $('.menu-toggle'), drawer = $('#drawer'), scrim = $('.scrim');
  function setNav(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('nav-open', open);
    if (open) { var first = $('.drawer-close', drawer); if (first) first.focus(); }
  }
  if (toggle && drawer) {
    toggle.addEventListener('click', function () { setNav(!drawer.classList.contains('is-open')); });
    scrim.addEventListener('click', function () { setNav(false); });
    $$('[data-close-nav], #drawer nav a').forEach(function (el) { el.addEventListener('click', function () { setNav(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setNav(false); toggle.focus(); }
    });
  }

  /* ---------- Practice explorer (tabs) ---------- */
  var tabs = $$('.tablist [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    if (tab.scrollIntoView && window.matchMedia('(max-width: 860px)').matches) {
      tab.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var next = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
      var prev = e.key === 'ArrowUp' || e.key === 'ArrowRight';
      if (!next && !prev) return;
      e.preventDefault();
      selectTab(tabs[(i + (next ? 1 : -1) + tabs.length) % tabs.length], true);
    });
  });
  function openAreaFromHash() {
    var m = location.hash.match(/^#area-([a-z-]+)$/);
    if (!m) return;
    var t = document.getElementById('tab-' + m[1]);
    if (t) { selectTab(t); var s = document.getElementById('practice'); if (s) s.scrollIntoView(); }
  }
  $$('a[href*="#area-"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var key = a.getAttribute('href').split('#area-')[1];
      var t = document.getElementById('tab-' + key);
      if (t) selectTab(t);
    });
  });
  if (tabs.length) { openAreaFromHash(); window.addEventListener('hashchange', openAreaFromHash); }

  /* ---------- Topic prefill for the contact form ---------- */
  function setTopic(v) {
    var sel = document.getElementById('topic');
    if (sel && v) { sel.value = v; }
  }
  $$('[data-topic]').forEach(function (el) {
    el.addEventListener('click', function () { setTopic(el.getAttribute('data-topic')); });
  });
  var topicParam = new URLSearchParams(location.search).get('topic');
  if (topicParam) setTopic(topicParam);

  /* ---------- Hero matter picker ---------- */
  var picker = document.getElementById('matter');
  if (picker) {
    var wa = document.getElementById('matterWa');
    var book = document.getElementById('matterBook');
    var update = function () {
      var checked = $('input[name="matter"]:checked', picker);
      var v = checked ? checked.value : '';
      var msg = v ? 'مرحباً، أودّ حجز استشارة بخصوص: ' + v : 'مرحباً، أودّ الاستفسار عن خدمات المكتب.';
      wa.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
      if (book) book.setAttribute('data-topic', v);
    };
    picker.addEventListener('change', update);
    update();
  }

  /* ---------- Contact form (Formspree) ---------- */
  var form = document.getElementById('contactForm');
  if (form) {
    var status = document.getElementById('formStatus');
    var submit = $('button[type="submit"]', form);
    var rules = {
      name: function (v) { return v.trim().length >= 2; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); },
      message: function (v) { return v.trim().length >= 10; }
    };
    var check = function (id) {
      var input = document.getElementById(id);
      var ok = rules[id](input.value);
      input.closest('.field').classList.toggle('has-error', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    Object.keys(rules).forEach(function (id) {
      var input = document.getElementById(id);
      input.addEventListener('input', function () {
        if (input.closest('.field').classList.contains('has-error')) check(id);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = ''; status.className = 'form-status';
      var valid = ['name', 'email', 'message'].map(check).every(Boolean);
      if (!valid) { var bad = $('.has-error input, .has-error textarea', form); if (bad) bad.focus(); return; }
      submit.setAttribute('aria-busy', 'true');
      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            status.textContent = 'تم إرسال رسالتك. سنتواصل معك في أقرب وقت خلال ساعات العمل.';
            status.className = 'form-status ok';
          } else {
            return r.json().catch(function () { return {}; }).then(function (d) {
              status.textContent = d.errors ? 'لم تُرسل الرسالة: ' + d.errors.map(function (x) { return x.message; }).join('، ')
                : 'لم تُرسل الرسالة. أعد المحاولة أو اتصل بنا على 0661508837.';
              status.className = 'form-status fail';
            });
          }
        })
        .catch(function () {
          status.textContent = 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت أو راسلنا عبر واتساب.';
          status.className = 'form-status fail';
        })
        .then(function () { submit.removeAttribute('aria-busy'); });
    });
  }

  /* ---------- Newsletter (Formspree) ---------- */
  var news = document.getElementById('newsletter');
  if (news) {
    var nStatus = document.getElementById('newsStatus');
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button', news);
      btn.setAttribute('aria-busy', 'true');
      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(news), headers: { Accept: 'application/json' } })
        .then(function (r) {
          nStatus.textContent = r.ok ? 'تم تسجيل اشتراكك في النشرة القانونية.' : 'لم يتم التسجيل. تأكد من البريد الإلكتروني وأعد المحاولة.';
          nStatus.className = 'form-status ' + (r.ok ? 'ok' : 'fail');
          if (r.ok) news.reset();
        })
        .catch(function () { nStatus.textContent = 'تعذّر الاتصال بالخادم. أعد المحاولة لاحقاً.'; nStatus.className = 'form-status fail'; })
        .then(function () { btn.removeAttribute('aria-busy'); });
    });
  }

  /* ---------- Blog: search + category filters ---------- */
  var list = document.getElementById('postList');
  if (list) {
    var items = $$('[data-post]');
    var q = document.getElementById('q');
    var filters = $$('[data-filter]');
    var empty = document.getElementById('noResults');
    var current = 'all';
    var normalise = function (s) {
      return (s || '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    };
    var apply = function () {
      var term = normalise(q.value.trim());
      var shown = 0;
      items.forEach(function (el) {
        var okCat = current === 'all' || el.getAttribute('data-cat') === current;
        var okText = !term || normalise(el.textContent).indexOf(term) !== -1;
        var show = okCat && okText;
        el.hidden = !show;
        if (show) shown++;
      });
      empty.hidden = shown !== 0;
      filters.forEach(function (b) {
        if (b.classList.contains('filter')) b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === current));
      });
    };
    var setCat = function (cat) { current = cat; apply(); };
    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        setCat(b.getAttribute('data-filter'));
        if (!b.classList.contains('filter')) { var tools = $('.blog-tools'); if (tools) tools.scrollIntoView(); }
      });
    });
    q.addEventListener('input', apply);
    var params = new URLSearchParams(location.search);
    if (params.get('cat')) setCat(params.get('cat')); else apply();
  }

  /* ---------- Article: reading progress, TOC, copy link ---------- */
  var prose = $('.prose');
  var bar = $('.read-progress');
  if (prose && bar) {
    var ticking = false;
    var progress = function () {
      var r = prose.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.5;
      var done = Math.min(1, Math.max(0, (window.innerHeight * 0.3 - r.top) / Math.max(total, 1)));
      bar.style.transform = 'scaleX(' + done.toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
    progress();
  }
  var tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && byId[en.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
          byId[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    $$('.prose h2[id]').forEach(function (h) { io.observe(h); });
  }
  $$('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.getAttribute('data-copy-link') || location.href).then(function () {
        b.setAttribute('data-state', 'done');
        b.setAttribute('aria-label', 'تم نسخ الرابط');
        setTimeout(function () { b.removeAttribute('data-state'); b.setAttribute('aria-label', 'نسخ رابط المقال'); }, 2200);
      });
    });
  });
})();
