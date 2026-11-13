// Events calendar. Reads the event list from #events-data and draws a month grid.
// Without JavaScript the calendar stays hidden and the "Coming up" list below still works.
(function () {
  var cal = document.querySelector('.cal'), data = document.getElementById('events-data');
  if (!cal || !data) return;
  var events = [];
  try { events = JSON.parse(data.textContent) || []; } catch (e) { return; }

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var monthEl = cal.querySelector('.cal__month'), days = cal.querySelector('.cal__days');
  var panelDate = cal.querySelector('.cal__panel-date'), list = cal.querySelector('.cal__list');

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function key(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function parse(k) { var p = k.split('-'); return { y: +p[0], m: +p[1] - 1, d: +p[2] }; }
  function longDate(k) { var p = parse(k); return new Date(Date.UTC(p.y, p.m, p.d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }

  var byDay = {};
  events.forEach(function (e) { (byDay[e.date] = byDay[e.date] || []).push(e); });

  var now = new Date(), today = key(now.getFullYear(), now.getMonth(), now.getDate());
  var start = parse(cal.dataset.start || today);
  var view = { y: start.y, m: start.m };
  var selected = byDay[key(start.y, start.m, start.d)] ? key(start.y, start.m, start.d) : null;
  var focusKey = selected || key(start.y, start.m, start.d);

  function render(moveFocus) {
    monthEl.textContent = MONTHS[view.m] + ' ' + view.y;
    days.textContent = '';
    var first = new Date(view.y, view.m, 1).getDay(), count = new Date(view.y, view.m + 1, 0).getDate();
    var fk = parse(focusKey);
    if (fk.y !== view.y || fk.m !== view.m) focusKey = key(view.y, view.m, 1);
    var row;
    for (var i = 0; i < first + count; i++) {
      if (i % 7 === 0) { row = document.createElement('div'); row.className = 'cal__row'; row.setAttribute('role', 'row'); days.appendChild(row); }
      var cell = document.createElement('div'); cell.setAttribute('role', 'gridcell');
      if (i >= first) {
        var d = i - first + 1, k = key(view.y, view.m, d), evs = byDay[k];
        var b = document.createElement('button'); b.type = 'button'; b.className = 'cal__day'; b.dataset.key = k;
        b.textContent = d;
        var label = longDate(k);
        if (evs) { b.classList.add('has'); label += ', ' + evs.length + (evs.length > 1 ? ' events' : ' event'); var dot = document.createElement('span'); dot.className = 'cal__dot'; dot.setAttribute('aria-hidden', 'true'); b.appendChild(dot); }
        if (k === today) { b.classList.add('today'); label += ', today'; }
        if (k < today) b.classList.add('past');
        b.setAttribute('aria-label', label);
        b.setAttribute('aria-pressed', k === selected);
        b.tabIndex = k === focusKey ? 0 : -1;
        cell.appendChild(b);
      }
      row.appendChild(cell);
    }
    while (row && row.children.length < 7) { var pad2 = document.createElement('div'); pad2.setAttribute('role', 'gridcell'); row.appendChild(pad2); }
    if (moveFocus) { var f = days.querySelector('[data-key="' + focusKey + '"]'); if (f) f.focus(); }
    showPanel();
  }

  function showPanel() {
    list.textContent = '';
    var k = selected;
    if (!k) {
      // Nothing picked: show what's on this month.
      var prefix = view.y + '-' + pad(view.m + 1) + '-';
      var month = events.filter(function (e) { return e.date.indexOf(prefix) === 0; });
      panelDate.textContent = month.length ? 'This month' : 'Nothing on in ' + MONTHS[view.m] + ' yet';
      month.forEach(item);
      return;
    }
    panelDate.textContent = longDate(k);
    var evs = byDay[k] || [];
    if (!evs.length) { var li = document.createElement('li'); li.className = 'cal__none'; li.textContent = 'Nothing on this day.'; list.appendChild(li); }
    evs.forEach(item);
  }

  function item(e) {
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = e.url;
    var t = document.createElement('span'); t.className = 'cal__ev-title'; t.textContent = e.title;
    var m = document.createElement('span'); m.className = 'cal__ev-meta';
    var p = parse(e.date);
    m.textContent = [selected ? null : p.d + ' ' + MONTHS[p.m].slice(0, 3), e.kind, e.time, e.place].filter(Boolean).join(' · ');
    a.appendChild(t); a.appendChild(m); li.appendChild(a); list.appendChild(li);
  }

  function go(delta) { view.m += delta; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } selected = null; render(false); }
  cal.querySelector('.cal__prev').addEventListener('click', function () { go(-1); });
  cal.querySelector('.cal__next').addEventListener('click', function () { go(1); });
  cal.querySelector('.cal__today').addEventListener('click', function () {
    var t = parse(today); view = { y: t.y, m: t.m }; focusKey = today; selected = today; render(true);
  });

  days.addEventListener('click', function (e) {
    var b = e.target.closest('.cal__day'); if (!b) return;
    selected = selected === b.dataset.key ? null : b.dataset.key; focusKey = b.dataset.key; render(true);
  });

  // Arrow keys move a day or a week, Home/End jump to the start or end of the week, Page Up/Down change month.
  days.addEventListener('keydown', function (e) {
    var b = e.target.closest('.cal__day'); if (!b) return;
    var p = parse(b.dataset.key), dt = new Date(p.y, p.m, p.d), step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) dt.setDate(dt.getDate() + step);
    else if (e.key === 'Home') dt.setDate(dt.getDate() - dt.getDay());
    else if (e.key === 'End') dt.setDate(dt.getDate() + 6 - dt.getDay());
    else if (e.key === 'PageUp') dt.setMonth(dt.getMonth() - 1);
    else if (e.key === 'PageDown') dt.setMonth(dt.getMonth() + 1);
    else return;
    e.preventDefault();
    focusKey = key(dt.getFullYear(), dt.getMonth(), dt.getDate());
    if (dt.getFullYear() !== view.y || dt.getMonth() !== view.m) { view = { y: dt.getFullYear(), m: dt.getMonth() }; selected = null; render(true); return; }
    days.querySelectorAll('.cal__day').forEach(function (x) { x.tabIndex = x.dataset.key === focusKey ? 0 : -1; });
    days.querySelector('[data-key="' + focusKey + '"]').focus();
  });

  // The lists below are built when the site is published. Move any event that has
  // finished since then from Coming up to Past, using the visitor's own date.
  var up = document.querySelector('.elist--up'), pastList = document.querySelector('.elist--past');
  if (up && pastList) {
    up.querySelectorAll('li').forEach(function (li) {
      var t = li.querySelector('time');
      if (!t || t.getAttribute('datetime') >= today) return;
      li.classList.add('in');
      var meta = li.querySelector('.elist__meta'); if (meta) meta.remove();
      var arr = li.querySelector('.arr'); if (arr) arr.remove();
      pastList.insertBefore(li, pastList.firstChild);
      pastList.closest('.past-wrap').hidden = false;
    });
    if (!up.children.length) { var none = up.nextElementSibling; if (none && none.classList.contains('empty')) none.hidden = false; }
  }

  cal.hidden = false;
  render(false);
})();
