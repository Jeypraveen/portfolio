/* ==========================================================================
   Jey Praveen Sivaraj | portfolio behaviour
   Vanilla JS, no dependencies. Everything degrades gracefully without it.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var EMAIL = 'jeypraveenn@gmail.com';

  /* --------------------------------------------- 1. SCROLL PROGRESS + SPY */
  function initScroll() {
    var bar = $('.scroll-progress__bar');
    var sections = $$('main section[id]');
    var links = $$('[data-nav]');
    var locIdx = $('#topbar-loc i');
    var locName = $('#topbar-loc span');
    var ticking = false;

    function update() {
      ticking = false;

      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? Math.min(window.scrollY / max, 1) * 100 : 0) + '%';
      }

      var line = window.scrollY + window.innerHeight * 0.32;
      var currentSec = sections.length ? sections[0] : null;

      sections.forEach(function (sec) {
        if (sec.offsetTop <= line) currentSec = sec;
      });

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && sections.length) {
        currentSec = sections[sections.length - 1];
      }

      var currentId = currentSec ? currentSec.id : '';
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + currentId);
      });

      if (currentSec && locIdx && locName) {
        locIdx.textContent = currentSec.getAttribute('data-section-num') || '01';
        locName.textContent = currentSec.getAttribute('data-section-name') || 'Index';
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* --------------------------------------------- 2. SECTION TRANSITIONS */
  function playTransit(targetSection, goingUp) {
    if (reduceMotion.matches) return;

    var bar = $('#nav-transit');
    if (bar) {
      bar.classList.remove('is-sweeping');
      bar.style.animationDirection = goingUp ? 'reverse' : 'normal';
      void bar.offsetWidth;
      bar.classList.add('is-sweeping');
    }

    // The hero is not a .section, so it gets its own arrival motion when going back up.
    if (targetSection && !targetSection.classList.contains('section')) {
      var heroInner = targetSection.querySelector('.hero__inner');
      if (heroInner && heroInner.animate) {
        heroInner.animate(
          [
            { opacity: 0.35, transform: 'translateY(-22px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)' }
        );
      }
      return;
    }

    if (targetSection) {
      // Reveal children immediately so arriving at a section never shows blank content.
      $$('.reveal', targetSection).forEach(function (el) { el.classList.add('is-in'); });
      targetSection.classList.remove('is-arriving');
      void targetSection.offsetWidth;
      targetSection.classList.add('is-arriving');
      window.clearTimeout(targetSection._arriveTimer);
      targetSection._arriveTimer = window.setTimeout(function () {
        targetSection.classList.remove('is-arriving');
      }, 760);
    }
  }

  var scrollAnimId = 0;

  function smoothScrollTo(targetY, duration) {
    window.cancelAnimationFrame(scrollAnimId);
    if (reduceMotion.matches) {
      window.scrollTo(0, targetY);
      return;
    }

    var startY = window.scrollY;
    var diff = targetY - startY;
    if (Math.abs(diff) < 2) { window.scrollTo(0, targetY); return; }

    var startT = performance.now();
    var dur = duration || 440;

    function cancel() { window.cancelAnimationFrame(scrollAnimId); cleanup(); }
    function cleanup() {
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
    }
    window.addEventListener('wheel', cancel, { passive: true, once: true });
    window.addEventListener('touchstart', cancel, { passive: true, once: true });

    (function step(now) {
      var p = Math.min((now - startT) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      window.scrollTo(0, Math.round(startY + diff * eased));
      if (p < 1) {
        scrollAnimId = window.requestAnimationFrame(step);
      } else {
        cleanup();
      }
    })(startT);
  }

  function scrollToSection(target, blockCenter) {
    if (!target) return;
    var bar = $('#topbar');
    var barH = bar ? bar.offsetHeight : 62;
    var rect = target.getBoundingClientRect();
    var y = blockCenter
      ? Math.max(0, Math.round(rect.top + window.scrollY - (window.innerHeight - Math.min(rect.height, window.innerHeight * 0.7)) / 2))
      : Math.max(0, Math.round(rect.top + window.scrollY - barH - 8));
    var maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    smoothScrollTo(Math.min(y, maxY), 440);
  }

  function initSectionTransitions() {
    $$('a[data-nav]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        var target = document.getElementById(href.slice(1));
        if (!target) return;

        e.preventDefault();
        if (initMenu.closeForNav) initMenu.closeForNav();
        document.body.style.overflow = '';

        var goingUp = target.getBoundingClientRect().top < -4;
        scrollToSection(target);
        try { if (history.replaceState) history.replaceState(null, '', href); } catch (err) { /* file:// */ }
        playTransit(target, goingUp);
      });
    });
  }

  /* -------------------------------------------------------- 3. MOBILE NAV */
  function initMenu() {
    var toggle = $('#menu-toggle');
    var menu = $('#menu-overlay');
    if (!toggle || !menu) return;

    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      document.body.style.overflow = 'hidden';
      var first = $('a', menu);
      if (first) first.focus();
    }

    function close(restoreFocus) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
      window.setTimeout(function () { menu.hidden = true; }, 280);
      if (restoreFocus !== false && lastFocus && lastFocus.focus) {
        try { lastFocus.focus({ preventScroll: true }); } catch (err) { lastFocus.focus(); }
      }
    }

    initMenu.closeForNav = function () {
      if (toggle.getAttribute('aria-expanded') === 'true') close(false);
    };

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') close(true); else open();
    });

    $$('[data-menu-link]', menu).forEach(function (a) {
      a.addEventListener('click', function () { close(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true);
      if (e.key !== 'Tab' || menu.hidden) return;

      var items = $$('a, button', menu).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960 && toggle.getAttribute('aria-expanded') === 'true') close();
    });
  }

  /* --------------------------------------------------------- 4. HERO TYPE */
  function initHeroType() {
    $$('[data-split]').forEach(function (el, wordIndex) {
      var text = el.textContent;
      el.textContent = '';
      var offset = wordIndex * 0.1;

      text.split('').forEach(function (ch, i) {
        var span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.animationDelay = (offset + i * 0.028) + 's';
        el.appendChild(span);
      });
    });
  }

  /* ------------------------------------------------------- 5. ROLE CYCLER */
  function initRoleCycler() {
    var el = $('#role-rotator');
    if (!el) return;

    var words = [
      'agentic AI systems',
      'core AI pipelines',
      'healthcare AI',
      'production software'
    ];
    var index = 0;

    if (reduceMotion.matches) {
      window.setInterval(function () {
        index = (index + 1) % words.length;
        el.textContent = words[index];
      }, 4000);
      return;
    }

    var GLYPHS = 'abcdefghijklmnopqrstuvwxyz';

    function scrambleTo(target) {
      var from = el.textContent;
      var len = Math.max(from.length, target.length);
      var frame = 0;
      var plan = [];

      for (var i = 0; i < len; i++) {
        plan.push({
          from: from[i] || '',
          to: target[i] || '',
          start: Math.floor(Math.random() * 14),
          end: Math.floor(Math.random() * 14) + 14
        });
      }

      (function tick() {
        var out = '';
        var done = 0;

        for (var i = 0; i < plan.length; i++) {
          var p = plan[i];
          if (frame >= p.end) { out += p.to; done++; }
          else if (frame >= p.start) { out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }
          else { out += p.from; }
        }

        el.textContent = out;
        frame++;
        if (done < plan.length) requestAnimationFrame(tick);
      })();
    }

    window.setInterval(function () {
      index = (index + 1) % words.length;
      scrambleTo(words[index]);
    }, 3600);
  }

  /* ------------------------------------------------------------ 6. REVEAL */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          // Entering view (from above when scrolling up, from below when scrolling down): play in.
          el.style.transform = '';
          el.classList.add('is-in');
        } else {
          // Fully out of view: reset so the transition plays again next time, from the side it left.
          var leftThroughTop = entry.boundingClientRect.top < 0;
          el.classList.remove('is-in');
          el.style.transform = leftThroughTop ? 'translateY(-22px)' : 'translateY(22px)';
        }
      });
    }, { rootMargin: '0px 0px 40px 0px', threshold: 0.02 });

    items.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 4) * 55) + 'ms';
      io.observe(el);
    });
  }

  /* ---------------------------------------------------------- 7. POINTER */
  function initPointer() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest('[data-spot]') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    if (reduceMotion.matches) return;

    var cursor = $('.cursor');
    var dot = $('.cursor__dot');
    var ring = $('.cursor__ring');
    if (!cursor || !dot || !ring) return;

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var rx = tx, ry = ty;
    var visible = false;

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!visible) { visible = true; cursor.classList.remove('is-hidden'); }

      var hot = e.target.closest
        ? e.target.closest('a, button, input, .stack__list li, [data-spot]')
        : null;
      cursor.classList.toggle('is-hot', !!hot);
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      visible = false;
      cursor.classList.add('is-hidden');
    });

    (function loop() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
  }

  /* ----------------------------------------------------- 8. WORK FILTERS */
  function initWorkFilters() {
    var buttons = $$('[data-filter]');
    var cards = $$('#cases [data-category]');
    var miniGrid = $('#mini-grid');
    var counter = $('#filter-count');
    var empty = $('#cases-empty');
    if (!buttons.length || !cards.length) return;

    function applyFilter(value) {
      var shown = 0;
      var shownMinis = 0;

      cards.forEach(function (card) {
        var cats = (card.getAttribute('data-category') || '').split(/\s+/);
        var match = value === 'all' || cats.indexOf(value) !== -1;
        card.classList.toggle('is-hidden', !match);
        if (match) {
          shown++;
          if (card.classList.contains('mini')) shownMinis++;
        }
      });

      if (miniGrid) miniGrid.classList.toggle('grid4--single', shownMinis === 1);

      buttons.forEach(function (b) {
        var on = b.getAttribute('data-filter') === value;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      if (counter) counter.textContent = 'Showing ' + shown + ' of ' + cards.length;
      if (empty) empty.hidden = shown !== 0;
      return shown;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    applyFilter('all');
    initWorkFilters.reset = function () { applyFilter('all'); };
  }

  /* ------------------------------------------------- 9. CASE STUDY DRAWER */
  function initCaseDrawers() {
    $$('.case__toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.case');
        if (!card) return;
        var open = !card.classList.contains('is-open');
        card.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        var label = $('.case__toggle-text', btn);
        if (label) label.textContent = open ? 'Close' : 'Case study';
      });
    });
  }

  /* ------------------------------------------------------ 10. FOCUS JUMPS */
  function initJumps() {
    $$('[data-jump]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('data-jump');
        var target = document.querySelector('[data-project="' + id + '"]');
        if (!target) return;

        e.preventDefault();
        if (initWorkFilters.reset) initWorkFilters.reset();

        target.classList.add('is-in');
        playTransit(target.closest('section'));
        scrollToSection(target, true);

        target.classList.remove('is-flash');
        requestAnimationFrame(function () { target.classList.add('is-flash'); });
        window.setTimeout(function () { target.classList.remove('is-flash'); }, 1600);

        var toggle = $('.case__toggle', target);
        if (toggle && toggle.getAttribute('aria-expanded') === 'false') toggle.click();
      });
    });
  }

  /* ------------------------------------------------- 11. STACK FILTER-SEARCH */
  function initStack() {
    var buttons = $$('[data-skill]');
    var grid = $('#stack-grid');
    var groups = $$('#stack-grid .stack__group');
    var input = $('#skill-search');
    var empty = $('#stack-empty');
    if (!groups.length) return;

    var items = $$('#stack-grid .stack__list li').map(function (li) {
      return { el: li, text: li.textContent, lower: li.textContent.toLowerCase() };
    });

    var category = 'all';

    function render() {
      var q = input ? input.value.trim().toLowerCase() : '';
      var total = 0;

      items.forEach(function (item) {
        var group = item.el.closest('.stack__group');
        var inCat = category === 'all' || group.getAttribute('data-skill-cat') === category;
        var inQuery = !q || item.lower.indexOf(q) !== -1;
        var show = inCat && inQuery;

        item.el.classList.toggle('is-hidden', !show);

        if (show && q) {
          var at = item.lower.indexOf(q);
          item.el.innerHTML = '';
          item.el.appendChild(document.createTextNode(item.text.slice(0, at)));
          var mark = document.createElement('mark');
          mark.textContent = item.text.slice(at, at + q.length);
          item.el.appendChild(mark);
          item.el.appendChild(document.createTextNode(item.text.slice(at + q.length)));
        } else if (item.el.firstElementChild) {
          item.el.textContent = item.text;
        }

        if (show) total++;
      });

      var visibleGroups = 0;
      groups.forEach(function (g) {
        var visible = $$('.stack__list li', g).some(function (li) {
          return !li.classList.contains('is-hidden');
        });
        g.classList.toggle('is-hidden', !visible);
        if (visible) visibleGroups++;
      });

      if (grid) grid.classList.toggle('stack--single', visibleGroups === 1);
      if (empty) empty.hidden = total !== 0;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        category = btn.getAttribute('data-skill');
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        render();
      });
    });

    if (input) {
      input.addEventListener('input', render);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; render(); }
      });
    }

    render();
  }

  /* --------------------------------------------------------- 12. LIGHTBOX */
  function initLightbox() {
    var lb = $('#lightbox');
    if (!lb) return;

    var img = $('.lb__img', lb);
    var cap = $('.lb__cap', lb);
    var closeBtn = $('.lb__close', lb);
    var prevBtn = $('.lb__nav--prev', lb);
    var nextBtn = $('.lb__nav--next', lb);

    var triggers = $$('[data-lightbox]');
    if (!triggers.length) return;

    var index = 0;
    var lastFocus = null;

    function show(i) {
      index = (i + triggers.length) % triggers.length;
      var t = triggers[index];
      img.src = t.getAttribute('data-lightbox');
      img.alt = t.getAttribute('data-caption') || '';
      cap.textContent = (index + 1) + ' / ' + triggers.length + ' | ' + (t.getAttribute('data-caption') || '');
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      window.setTimeout(function () { lb.hidden = true; img.src = ''; }, 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    triggers.forEach(function (t, i) {
      t.addEventListener('click', function () { open(i); });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(index - 1); });
    nextBtn.addEventListener('click', function () { show(index + 1); });

    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb__figure')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { close(); }
      if (e.key === 'ArrowLeft') { show(index - 1); }
      if (e.key === 'ArrowRight') { show(index + 1); }
      if (e.key === 'Tab') {
        var items = [closeBtn, prevBtn, nextBtn];
        var at = items.indexOf(document.activeElement);
        e.preventDefault();
        items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      }
    });
  }

  /* ------------------------------------------------------ 13. COPY & MISC */
  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-on');
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  function initCopyEmail() {
    var btn = $('#copy-email');
    if (!btn) return;

    btn.addEventListener('click', function () {
      function done() {
        btn.classList.add('is-done');
        toast('Email copied');
        window.setTimeout(function () { btn.classList.remove('is-done'); }, 2200);
      }

      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = EMAIL;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          if (document.execCommand('copy')) done();
          else toast('Copy failed: ' + EMAIL);
        } catch (e) {
          toast('Copy failed: ' + EMAIL);
        }
        document.body.removeChild(ta);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EMAIL).then(done).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  function initResumeLinks() {
    $$('[data-resume-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href') || '';
        if (href === '#resume-pending') {
          e.preventDefault();
          toast('Resume Drive link pending, share link to activate');
        }
      });
    });
  }

  function initYear() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------- BOOT */
  function boot() {
    initHeroType();
    initRoleCycler();
    initScroll();
    initMenu();
    initSectionTransitions();
    initReveal();
    initPointer();
    initWorkFilters();
    initCaseDrawers();
    initJumps();
    initStack();
    initLightbox();
    initCopyEmail();
    initResumeLinks();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();