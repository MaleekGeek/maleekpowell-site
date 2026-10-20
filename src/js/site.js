document.documentElement.classList.add('js');
(function () {
  var html = document.documentElement;

  // Menu
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  function setMenu(open) { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); if (open) menu.querySelector('a').focus(); }
  btn.addEventListener('click', function () { setMenu(true); });
  menu.querySelector('.close').addEventListener('click', function () { setMenu(false); btn.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); btn.focus(); } });

  // Fit the hero name to the width with whatever font is showing (fallback included)
  var name = document.querySelector('.hero__name h1');
  function fitName() {
    if (!name) return;
    name.style.fontSize = '';
    var box = name.parentElement, cs = getComputedStyle(box);
    var avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    name.style.display = 'inline-block';
    var w = name.scrollWidth, fs = parseFloat(getComputedStyle(name).fontSize);
    if (w > avail) name.style.fontSize = Math.floor(fs * avail / w * 0.98) + 'px';
    name.style.display = '';
  }
  fitName();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
  window.addEventListener('resize', fitName);

  // Hero video: muted autoplay only, never with sound; poster only under reduced motion
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.hero__vid').forEach(function (v) {
    v.muted = true;
    if (v.getAttribute('src') && !reduce) v.play().catch(function () {});
  });

  // Pause every looping move, and the hero video itself
  document.querySelectorAll('.pause').forEach(function (pz) {
    pz.addEventListener('click', function () {
      var on = pz.getAttribute('aria-pressed') !== 'true';
      document.querySelectorAll('.pause').forEach(function (p) { p.setAttribute('aria-pressed', on); p.textContent = on ? 'Play motion' : 'Pause motion'; });
      html.classList.toggle('paused', on);
      document.querySelectorAll('.hero__vid[src]').forEach(function (v) { on ? v.pause() : v.play().catch(function () {}); });
    });
  });

  // Parallax: photos and the hero drift a little slower than the page as you scroll.
  // Off under reduced motion and while motion is paused.
  var px = reduce ? [] : Array.prototype.slice.call(document.querySelectorAll('.hero__media, .tile.photo, .shot.photo, .work__shot.photo, .section-bg'));
  if (px.length) {
    var ticking = false;
    var drift = function () {
      ticking = false;
      var vh = window.innerHeight, still = html.classList.contains('paused');
      px.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var max = r.height * (el.classList.contains('hero__media') ? 0.04 : 0.06), off = still ? 0 : -((r.top + r.height / 2) - vh / 2) * 0.12;
        if (el.classList.contains('hero__media')) off = still ? 0 : Math.max(0, -r.top) * 0.35;
        el.style.setProperty('--py', Math.max(-max, Math.min(max, off)).toFixed(1) + 'px');
      });
    };
    var queue = function () { if (!ticking) { ticking = true; requestAnimationFrame(drift); } };
    html.classList.add('has-px');
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    document.querySelectorAll('.pause').forEach(function (p) { p.addEventListener('click', queue); });
    drift();
  }

  // Library filter (/watch/?theme=...)
  var chips = document.querySelectorAll('[data-filter]');
  if (chips.length) {
    var cards = document.querySelectorAll('.vcard[data-kind]'), empty = document.querySelector('.empty');
    var setF = function (f) {
      var n = 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.filter === f); });
      cards.forEach(function (c) { var show = f === 'all' || c.dataset.kind === f; c.hidden = !show; if (show) n++; });
      if (empty) empty.hidden = n > 0;
      var count = document.querySelector('.filter-count');
      if (count) count.textContent = n === 1 ? '1 post' : n + ' posts';
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { setF(c.dataset.filter); }); });
    var q = new URLSearchParams(location.search).get('theme');
    if (q && document.querySelector('[data-filter="' + q + '"]')) setF(q);
  }

  // Home: show the first event that hasn't passed yet (the page is built ahead of time)
  var nes = document.querySelectorAll('.next-event');
  if (nes.length) {
    var d = new Date(), t = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), shown = false;
    nes.forEach(function (ne) { ne.hidden = shown || ne.dataset.date < t; if (!ne.hidden) shown = true; });
    var also = nes[0].closest('.also'); if (also && !also.querySelector('.also__card:not([hidden])')) also.hidden = true;
  }

  // Signup forms: until the Kit form ID is set, don't submit anywhere
  document.querySelectorAll('form.form[data-mock]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = f.querySelector('.done');
      if (d) d.textContent = 'Sign-up isn’t connected yet. It will be as soon as the email list is set up.';
    });
  });

  // Entrances
  var els = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    // Items in a sideways-scrolling row (the story chapters) reveal together with their row, so ones off to the side never stay hidden.
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.matches('.chapters__row')) e.target.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
      io.unobserve(e.target);
    }); }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { if (!el.closest('.chapters__row')) io.observe(el); });
    document.querySelectorAll('.chapters__row').forEach(function (row) { io.observe(row); });
    // Show everything when printing or saving the page.
    window.addEventListener('beforeprint', function () { els.forEach(function (el) { el.classList.add('in'); }); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }
})();

// Video pages: when the YouTube video ends, cover the player with the site's own "Watch next" picks.
// Talks to the embed by postMessage (enablejsapi=1), so no YouTube script is loaded on the page.
(function () {
  var frame = document.querySelector('.player iframe'), card = document.querySelector('.endcard');
  if (!frame || !card) return;
  function send(o) { if (frame.contentWindow) frame.contentWindow.postMessage(JSON.stringify(o), '*'); }
  function hello() {
    send({ event: 'listening', id: 1, channel: 'widget' });
    send({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' });
  }
  frame.addEventListener('load', function () { hello(); setTimeout(hello, 1000); setTimeout(hello, 3000); });
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://www.youtube-nocookie.com' || e.source !== frame.contentWindow) return;
    var d; try { d = JSON.parse(e.data); } catch (err) { return; }
    var state = d.event === 'onStateChange' ? d.info : (d.info && d.info.playerState);
    if (state === 0) card.hidden = false;      // ended
    else if (state === 1) card.hidden = true;  // playing again
  });
  card.querySelector('.endcard__again').addEventListener('click', function () {
    card.hidden = true;
    send({ event: 'command', func: 'seekTo', args: [0, true], id: 1, channel: 'widget' });
    send({ event: 'command', func: 'playVideo', args: [], id: 1, channel: 'widget' });
  });
})();
