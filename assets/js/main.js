// Portfolio interactions: loader and page curtain, mobile menu, scroll marquee,
// reveals, intro halves moving apart, cursor bubble.
// No libraries, except the Lottie player, loaded only on case screens that animate.
// With reduced motion only the menu and contact pill run.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Loader and page curtain ---------- */

  var curtain = document.querySelector('.curtain');
  var count = document.querySelector('.curtain__count');

  // scroll reveals wait until the curtain is up: if the page opens already scrolled
  // to a section (reload, back), its animation plays in view, not under the curtain
  var isReady = false, readyQueue = [];
  function whenReady(fn) { if (isReady) fn(); else readyQueue.push(fn); }
  function markReady() {
    if (isReady) return;
    isReady = true;
    readyQueue.splice(0).forEach(function (fn) { fn(); });
  }
  setTimeout(markReady, 4200); // same safety net as the curtain itself

  function lift() {
    if (!curtain) return;
    curtain.classList.add('is-up');
    setTimeout(markReady, 300);
  }

  // run fn once the image has its pixels (or failed): images fade in only then,
  // so the browser's "broken image" placeholder never flashes
  function whenLoaded(img, fn) {
    if (img.complete) { fn(); return; }
    img.addEventListener('load', fn, { once: true });
    img.addEventListener('error', fn, { once: true });
  }
  document.querySelectorAll('img').forEach(function (img) {
    var show = function () { if (img.naturalWidth) img.classList.add('is-loaded'); };
    if (img.complete) show(); else img.addEventListener('load', show, { once: true });
  });

  // language switch: no curtain, and the reader stays at the same place on the page
  var instant = root.classList.contains('no-curtain');
  if (instant) {
    var keepY = 0;
    try {
      keepY = parseInt(sessionStorage.getItem('yl-scroll'), 10) || 0;
      sessionStorage.removeItem('yl-instant');
      sessionStorage.removeItem('yl-scroll');
      sessionStorage.setItem('yl-loaded', '1');
    } catch (e) {}
    if (keepY) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo({ top: keepY, behavior: 'instant' });
      window.addEventListener('load', function () { window.scrollTo({ top: keepY, behavior: 'instant' }); });
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[hreflang]');
    if (!a) return;
    try {
      sessionStorage.setItem('yl-instant', '1');
      sessionStorage.setItem('yl-scroll', String(Math.round(window.scrollY)));
    } catch (err) {}
  }, true);

  // the loading screen plays once, on the first visit; moving between pages opens the next page straight away
  if (curtain && !reduce && !instant) {
    try { sessionStorage.setItem('yl-loaded', '1'); } catch (e) {}
    // the counter stops at 99 until the hero photo is ready, so it never appears half-loaded
    var photo = document.querySelector('.hero__photo img');
    var photoReady = !photo;
    if (photo) whenLoaded(photo, function () { photoReady = true; });
    var n = 0;
    var tick = setInterval(function () {
      n = Math.min(photoReady ? 100 : 99, n + Math.ceil(Math.random() * 14));
      if (count) count.textContent = n;
      if (n >= 100) { clearInterval(tick); setTimeout(lift, 150); }
    }, 30);

    // back/forward cache: never show a stuck curtain
    window.addEventListener('pageshow', function (e) { if (e.persisted) lift(); });
  } else {
    if (curtain) curtain.classList.add('is-skip');
    try { sessionStorage.setItem('yl-loaded', '1'); } catch (e) {}
    markReady();
  }

  /* ---------- Thin loading bar on slow page changes ---------- */

  // after a click on a link to another page of the site, a thin bar runs along the top,
  // but only if the next page takes longer than a moment to open
  var loadBar = document.createElement('div');
  loadBar.className = 'load-bar';
  loadBar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(loadBar);
  var loadTimer = 0;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    clearTimeout(loadTimer);
    loadTimer = setTimeout(function () { loadBar.classList.add('is-on'); }, 300);
  });
  // coming back with the back button: the bar is never left running
  window.addEventListener('pageshow', function () { clearTimeout(loadTimer); loadBar.classList.remove('is-on'); });

  /* ---------- Mobile menu ---------- */

  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var label = toggle.querySelector('.menu-toggle__label');
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? toggle.dataset.close : toggle.dataset.open;
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
  }

  /* ---------- Floating contact pill ---------- */

  var pill = document.querySelector('.float-cta');
  var toTop = document.querySelector('.to-top');
  var hero = document.querySelector('.hero');
  var cover = document.querySelector('.case-cover');
  var footer = document.querySelector('.site-footer');
  if (pill) {
    var updatePill = function () {
      var y = window.scrollY;
      // home: after most of the hero photo; case pages: once the cover has scrolled away
      var afterHero = hero ? y > hero.offsetHeight * 0.6
        : cover ? y > cover.offsetTop + cover.offsetHeight
        : true;
      var beforeFooter = !footer || footer.getBoundingClientRect().top > window.innerHeight * 0.8;
      var show = afterHero && beforeFooter;
      pill.classList.toggle('is-visible', show);
      if (toTop) toTop.classList.toggle('is-visible', show);
    };
    updatePill();
    window.addEventListener('scroll', updatePill, { passive: true });
  }

  /* ---------- Two-tone name over the hero photo ---------- */

  // the white copy of the name is cut to the photo's arch, so the letters stay readable on dark clothes
  var nameLight = document.querySelector('.hero__name-light');
  var heroArch = document.querySelector('.hero__photo');
  if (nameLight && heroArch) {
    var cutName = function () {
      var p = heroArch.getBoundingClientRect(), n = nameLight.getBoundingClientRect();
      var cs = getComputedStyle(heroArch);
      var top = Math.min(parseFloat(cs.borderTopLeftRadius), p.width / 2);
      var bottom = parseFloat(cs.borderBottomLeftRadius) || 0;
      nameLight.style.clipPath = 'inset(' + (p.top - n.top).toFixed(1) + 'px ' + (n.right - p.right).toFixed(1) + 'px ' +
        (n.bottom - p.bottom).toFixed(1) + 'px ' + (p.left - n.left).toFixed(1) + 'px round ' +
        top + 'px ' + top + 'px ' + bottom + 'px ' + bottom + 'px)';
    };
    cutName();
    window.addEventListener('load', cutName);
    window.addEventListener('resize', cutName);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(cutName);
  }

  /* ---------- Back to top (case pages) ---------- */

  if (toTop) {
    toTop.addEventListener('click', function () {
      var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
      // keyboard and screen reader users land on the case title, not back on the button
      var title = document.querySelector('h1');
      if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
    });
  }

  if (reduce) return;

  /* ---------- Marquees: always moving left, scrolling speeds them up ---------- */

  var marquees = [].slice.call(document.querySelectorAll('[data-marquee]')).map(function (el) {
    // duplicate the content so the loop is seamless
    el.innerHTML += el.innerHTML;
    [].slice.call(el.children).slice(el.children.length / 2).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
    return { el: el, x: 0, base: parseFloat(el.dataset.marquee) || 0.5 };
  });

  // always moves left (text comes in from the right, the way we read); scrolling only speeds it up
  var dir = -1;
  var boost = 0;
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    var d = y - lastY;
    boost = Math.min(14, boost + Math.abs(d) * 0.06);
    lastY = y;
  }, { passive: true });

  /* ---------- Hero photo parallax ---------- */

  var heroImg = document.querySelector('.hero__photo img');

  function frame() {
    boost *= 0.92;
    marquees.forEach(function (m) {
      var w = m.el.scrollWidth / 2;
      m.x += dir * (m.base + boost * 0.35);
      if (m.x <= -w) m.x += w;
      if (m.x > 0) m.x -= w;
      m.el.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,0,0)';
    });
    if (heroImg && hero) {
      var p = Math.min(1, window.scrollY / hero.offsetHeight);
      heroImg.style.transform = 'translate3d(0,' + (p * -10).toFixed(2) + '%,0) scale(' + (1 + p * 0.06).toFixed(3) + ')';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Reveal on scroll ---------- */

  // sequential lists: number the items so CSS can delay each one;
  // .is-done drops the delays after the reveal so hover reacts at once
  document.querySelectorAll('[data-list]').forEach(function (list) {
    [].forEach.call(list.children, function (child, i) { child.style.setProperty('--i', i); });
    list.addEventListener('transitionend', function (e) {
      if (e.target === list && list.classList.contains('is-in')) list.classList.add('is-done');
    });
  });
  var revealables = document.querySelectorAll('.reveal-img, .reveal-up, [data-list]');
  var shimmer = document.querySelector('.footer__title');
  if (shimmer) {
    // the heart gets the same gradient as the text, placed where it sits in the title
    var heart = shimmer.querySelector('.footer__heart');
    var place = function () {
      var r = shimmer.getBoundingClientRect();
      shimmer.style.setProperty('--tw', r.width.toFixed(1) + 'px');
      shimmer.style.setProperty('--th', r.height.toFixed(1) + 'px');
      if (heart) {
        var h = heart.getBoundingClientRect();
        shimmer.style.setProperty('--hx', (h.left - r.left).toFixed(1) + 'px');
        shimmer.style.setProperty('--hy', (h.top - r.top).toFixed(1) + 'px');
      }
    };
    place();
    window.addEventListener('load', place);
    window.addEventListener('resize', place);
    shimmer.addEventListener('animationend', function () { shimmer.classList.add('is-done'); });
    // the shimmer plays every time the title comes back into view, but only after it has
    // left the screen completely, so small scrolls at the edge never restart it
    if ('IntersectionObserver' in window) {
      var armed = true;
      var ioShine = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && armed) {
            armed = false;
            place();
            shimmer.classList.remove('is-in', 'is-done');
            void shimmer.offsetWidth; // restart the animation
            shimmer.classList.add('is-in');
          } else if (!en.isIntersecting) {
            armed = true;
          }
        });
      });
      whenReady(function () { ioShine.observe(shimmer); });
    } else {
      shimmer.classList.add('is-done');
    }
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    // sequential lists start later, when their top is a third of the way up the screen,
    // so the whole sequence plays while the reader is looking at it
    var ioList = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); ioList.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -30% 0px' });
    whenReady(function () {
      revealables.forEach(function (el) { (el.hasAttribute('data-list') ? ioList : io).observe(el); });
    });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Statement: the two sides move apart while the section scrolls in ---------- */

  // The two columns start stacked at the center and split to their places.
  // Progress follows the columns themselves: 0 when their top is at 95% of the
  // screen height (just in view), 1 at 68%, so the sides are fully apart by the
  // time the whole section sits in the middle of the screen.
  var apart = document.querySelector('[data-apart]');
  var pair = apart && apart.querySelector('.statement__pair');
  if (pair) {
    var halves = [].slice.call(pair.querySelectorAll('.statement__half'));
    var measure = function () {
      // offsetLeft ignores transforms, so this is each column's resting place
      var mid = pair.offsetWidth / 2;
      halves.forEach(function (h) {
        h.style.setProperty('--shift', (mid - (h.offsetLeft + h.offsetWidth / 2)).toFixed(1) + 'px');
      });
    };
    var spread = function () {
      measure(); // cheap, and always right after late layout changes (fonts, images)
      var top = pair.getBoundingClientRect().top;
      var vh = window.innerHeight;
      var t = Math.max(0, Math.min(1, (vh * 0.95 - top) / (vh * 0.27)));
      var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      apart.style.setProperty('--p', eased.toFixed(3));
      // phones (one side under the other): each side rises on its own as it travels
      // from the bottom of the screen (95%) to 70% of its height, so both are in place when the
      // section sits in the middle of the screen; the CSS uses this only below 768 px
      halves.forEach(function (h) {
        var s = Math.max(0, Math.min(1, (vh * 0.95 - h.getBoundingClientRect().top) / (vh * 0.25)));
        var part = function (from, len) { var x = Math.max(0, Math.min(1, (s - from) / len)); return (1 - Math.pow(1 - x, 3)).toFixed(3); };
        h.style.setProperty('--pl', part(0, 0.5));
        h.style.setProperty('--pt', part(0.2, 0.55));
        h.style.setProperty('--pt2', part(0.35, 0.65));
      });
    };
    spread();
    window.addEventListener('load', spread);
    window.addEventListener('resize', spread);
    window.addEventListener('scroll', spread, { passive: true });
  }

  /* ---------- Lottie animations and the drawn chart on case screens ----------
     The static screen (with the illustration) stays for reduced motion and no-JS.
     Otherwise, when a screen comes into view, the player loads once, the screen
     swaps to a version without the illustration and the animation plays over it. */

  var lottieBoxes = document.querySelectorAll('.shot__lottie[data-lottie], .shot__chart[data-base]');
  if (lottieBoxes.length && !reduce && 'IntersectionObserver' in window) {
    var mainSrc = (document.querySelector('script[src*="main.js"]') || {}).src || '';
    var playerReady = null;
    var loadPlayer = function () {
      if (!playerReady) {
        playerReady = new Promise(function (ok, fail) {
          var s = document.createElement('script');
          s.src = mainSrc.replace(/main\.js.*$/, 'vendor/lottie_svg.min.js');
          s.onload = ok; s.onerror = fail;
          document.head.appendChild(s);
        });
      }
      return playerReady;
    };
    var start = function (box) {
      if (box.anim) return;
      box.anim = 'pending';
      var screen = box.parentNode.querySelector('img');
      var bare = new Image();
      bare.src = box.dataset.base;
      if (!box.dataset.lottie) {
        // CSS animation (the chart): swap the screen, then run it while in view
        var showChart = function () {
          screen.src = box.dataset.base;
          box.classList.add('is-live');
          box.anim = { play: function () { box.classList.add('is-playing'); }, pause: function () { box.classList.remove('is-playing'); } };
          if (box.inView) box.anim.play();
        };
        if (bare.complete) showChart(); else bare.onload = showChart;
        return;
      }
      loadPlayer().then(function () {
        var anim = window.lottie.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: false, path: box.dataset.lottie });
        anim.addEventListener('DOMLoaded', function () {
          var show = function () {
            screen.src = box.dataset.base;
            box.classList.add('is-live');
            box.anim = anim;
            if (box.inView) anim.play();
          };
          if (bare.complete) show(); else bare.onload = show;
        });
      }).catch(function () {});
    };
    var lottieWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var box = e.target;
        box.inView = e.isIntersecting;
        if (e.isIntersecting) start(box);
        if (box.anim && box.anim.play) { if (e.isIntersecting) box.anim.play(); else box.anim.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    lottieBoxes.forEach(function (box) { lottieWatch.observe(box); });
  }

  if (!finePointer) return;

  /* ---------- Cursor bubble over case cards ---------- */

  var cursor = document.querySelector('.cursor');
  if (cursor) {
    var cx = 0, cy = 0, tx = 0, ty = 0, s = 0, ts = 0;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });
    (function follow() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      s += (ts - s) * 0.2;
      cursor.style.opacity = s > 0.02 ? 1 : 0;
      cursor.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
      requestAnimationFrame(follow);
    })();
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('mouseenter', function () { ts = 1; });
      card.addEventListener('mouseleave', function () { ts = 0; });
    });
  }
})();
