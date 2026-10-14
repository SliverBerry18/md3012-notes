/* MD3012 notes website: theme, revised ticks (per device), search, self-test reveal, high-yield filter,
   phone contents sheet + swipe, contents highlight, practice questions, topics filter. */
(function () {
  var doc = document.documentElement, body = document.body;
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var base = body.dataset.base || '';
  // site data comes as small scripts (data/<name>.js) so every page also works when opened straight from the folder
  var dataP = {};
  function loadData(name) {
    if (dataP[name]) return dataP[name];
    if (window.MD3012_DATA) return (dataP[name] = window.MD3012_DATA(name)); // published site: encrypted data files
    return (dataP[name] = new Promise(function (res, rej) {
      var w = window.MD3012 || {}; if (w[name]) { res(w[name]); return; }
      var s = document.createElement('script'); s.src = base + 'data/' + name + '.js';
      s.onload = function () { res((window.MD3012 || {})[name]); }; s.onerror = function () { rej(new Error('missing ' + name)); };
      document.head.appendChild(s);
    }));
  }

  // ---- theme: light / dark (follows the device until you pick one)
  var themeBtn = document.querySelector('.theme');
  function paintTheme() {
    var dark = doc.dataset.theme === 'dark';
    if (themeBtn) { themeBtn.textContent = dark ? '☀' : '☾'; themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode'); themeBtn.title = themeBtn.getAttribute('aria-label'); }
  }
  paintTheme();
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = doc.dataset.theme === 'dark' ? 'light' : 'dark';
    doc.dataset.theme = next; lsSet('md3012:theme', next); paintTheme();
  });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var follow = function (e) { if (lsGet('md3012:theme', null) === null) { doc.dataset.theme = e.matches ? 'dark' : 'light'; paintTheme(); } };
    if (mq.addEventListener) mq.addEventListener('change', follow);
  }

  // ---- revision board
  var done = lsGet('md3012:revised', {});
  document.querySelectorAll('.cell[data-key]').forEach(function (c) { if (done[c.dataset.key]) c.classList.add('done'); });
  document.querySelectorAll('.count[data-mod]').forEach(function (el) {
    var m = el.dataset.mod, total = document.querySelectorAll('#' + m + ' .cell[data-key]').length;
    var n = document.querySelectorAll('#' + m + ' .cell.done').length;
    el.textContent = total ? n + ' of ' + total + ' revised' : '';
  });

  // ---- week page: tick button
  var tick = document.querySelector('.tick');
  if (tick) {
    var k = body.dataset.key;
    var setT = function () { var on = !!done[k]; tick.setAttribute('aria-pressed', on); tick.textContent = on ? 'Revised ✓' : 'Mark revised'; };
    setT();
    tick.addEventListener('click', function () { if (done[k]) delete done[k]; else done[k] = Date.now(); lsSet('md3012:revised', done); setT(); });
  }

  var notes = document.querySelector('main.notes');

  // ---- week page: interactive self-test
  var st = document.querySelectorAll('.notes .st');
  if (st.length >= 2) {
    var qs = st[0].querySelectorAll('li'), as = st[1].querySelectorAll('li');
    if (qs.length === as.length) {
      st[0].classList.add('st-web');
      qs.forEach(function (li, i) {
        var a = as[i].cloneNode(true), qn = a.querySelector('.qn');
        if (qn) qn.remove();
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'reveal'; b.textContent = 'Show answer'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('data-ui', '1');
        var box = document.createElement('span');
        box.className = 'ans'; box.hidden = true; box.innerHTML = a.innerHTML; box.setAttribute('data-ui', '1');
        b.addEventListener('click', function () {
          box.hidden = !box.hidden; b.textContent = box.hidden ? 'Show answer' : 'Hide answer'; b.setAttribute('aria-expanded', String(!box.hidden));
        });
        li.appendChild(b); li.appendChild(box);
      });
      st[1].hidden = true;
      var prev = st[1].previousElementSibling;
      if (prev && /Answers/.test(prev.textContent)) prev.hidden = true;
      var all = document.createElement('button');
      all.type = 'button'; all.className = 'st-all'; all.textContent = 'Show all answers'; all.setAttribute('data-ui', '1');
      all.addEventListener('click', function () {
        var open = all.textContent.indexOf('Show') === 0;
        st[0].querySelectorAll('.ans').forEach(function (x) { x.hidden = !open; });
        st[0].querySelectorAll('.reveal').forEach(function (x) { x.textContent = open ? 'Hide answer' : 'Show answer'; x.setAttribute('aria-expanded', String(open)); });
        all.textContent = open ? 'Hide all answers' : 'Show all answers';
      });
      st[0].parentNode.insertBefore(all, st[0]);
    }
  }

  // ---- week page: high-yield only
  var hyBtn = document.querySelector('.hy-btn');
  if (hyBtn && notes) {
    var KEEP_ALL = /quick reference|self-test|osce checklist/i, DROP = /^lo map$|^sources/i;
    var tocFor = {};
    document.querySelectorAll('.toc a').forEach(function (a) { tocFor[a.getAttribute('href').slice(1)] = a.parentNode; });
    var sec = null, secs = [];
    var blocks = notes.querySelectorAll(':scope > *, :scope > .sec > *');
    Array.prototype.forEach.call(blocks, function (el) {
      if (el.classList.contains('sec')) return;
      if (el.tagName === 'H1') { sec = { h: el, keepAll: KEEP_ALL.test(el.textContent), drop: DROP.test(el.textContent.trim()), kept: 0 }; secs.push(sec); return; }
      if (!sec) { // cover: keep the big-picture box only
        el.querySelectorAll('.abbr, figure, .figwrap, img').forEach(function (x) { x.classList.add('hy-x'); });
        return;
      }
      var keep = !sec.drop && (sec.keepAll || el.matches('.note,.tip,.remember') ||
        !!el.querySelector('.tag.exam,.tag.emph,li.ex,li.em,.note,.tip,.remember'));
      if (keep) sec.kept++; else el.classList.add('hy-x');
    });
    var shown = 0;
    secs.forEach(function (s) {
      if (!s.kept) {
        s.h.classList.add('hy-x');
        if (s.h.parentNode.classList.contains('sec')) s.h.parentNode.classList.add('hy-x');
        if (tocFor[s.h.id]) tocFor[s.h.id].classList.add('hy-x');
      } else shown++;
    });
    var noteEl = document.createElement('p');
    noteEl.className = 'hy-note'; noteEl.setAttribute('data-ui', '1');
    noteEl.textContent = 'High-yield only: exam-tagged and emphasised points, clinical pearls, quick reference and self-test (' + shown + ' of ' + secs.length + ' sections). Tap the button again to see everything.';
    notes.insertBefore(noteEl, notes.firstChild);
    var setH = function (on) { body.classList.toggle('hy', on); hyBtn.setAttribute('aria-pressed', String(on)); };
    setH(!!lsGet('md3012:hy', false));
    hyBtn.addEventListener('click', function () { var on = !body.classList.contains('hy'); setH(on); lsSet('md3012:hy', on); });
  }

  // ---- phone: contents bottom sheet
  var toc = document.querySelector('.toc'), fab = document.querySelector('.fab'), bg = document.querySelector('.sheet-bg');
  if (toc && fab) {
    var openS = function (o) { toc.classList.toggle('open', o); if (bg) bg.classList.toggle('open', o); fab.setAttribute('aria-expanded', String(o)); };
    fab.addEventListener('click', function () { openS(!toc.classList.contains('open')); });
    if (bg) bg.addEventListener('click', function () { openS(false); });
    toc.addEventListener('click', function (e) { if (e.target.closest('a')) openS(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openS(false); });
  }

  // ---- phone: swipe left/right for next/previous week
  var pn = document.querySelector('.pn');
  if (pn && 'ontouchstart' in window) {
    var x0 = 0, y0 = 0, t0 = 0, ok = false;
    var scrollsSideways = function (el) {
      for (; el && el !== body; el = el.parentElement) {
        if (el.matches && el.matches('table, .results, .toc, input, .zoom')) return true;
        if (el.scrollWidth > el.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
      }
      return false;
    };
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { ok = false; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); ok = !scrollsSideways(e.target);
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (!ok) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Date.now() - t0 > 700 || Math.abs(dx) < 90 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
      var target = pn.querySelector(dx < 0 ? 'a[data-dir=next]' : 'a[data-dir=prev]');
      if (target) location.href = target.href;
    }, { passive: true });
  }

  // ---- figures: tap to view full size
  if (notes) {
    var zoom = document.createElement('div');
    zoom.className = 'zoom'; zoom.hidden = true; zoom.setAttribute('role', 'dialog'); zoom.setAttribute('aria-label', 'Image, full size');
    zoom.innerHTML = '<button type="button" class="zclose" aria-label="Close">×</button><img alt="">';
    body.appendChild(zoom);
    var zimg = zoom.querySelector('img');
    var closeZ = function () { zoom.hidden = true; body.classList.remove('zoomed'); };
    zoom.addEventListener('click', function (e) { if (e.target !== zimg || e.target.closest('.zclose')) closeZ(); });
    zoom.querySelector('.zclose').addEventListener('click', closeZ);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !zoom.hidden) closeZ(); });
    notes.querySelectorAll('img').forEach(function (im) {
      im.addEventListener('click', function () { zimg.src = im.currentSrc || im.src; zimg.alt = im.alt || ''; zoom.hidden = false; body.classList.add('zoomed'); });
    });
  }

  // ---- contents highlight
  var links = document.querySelectorAll('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { links.forEach(function (a) { a.classList.remove('on'); }); var a = map[e.target.id]; if (a) a.classList.add('on'); }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    document.querySelectorAll('.notes h1[id]').forEach(function (h) { io.observe(h); });
  }

  function escH(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function label(r) { return r.m === 'CS' ? 'Clinical Skills' : r.m + ' Week ' + r.w; }

  // =====================================================================================
  // 2026-10-12 features. Everything a page adds to the notes carries data-ui so the
  // highlight anchoring (which works on the notes' own text) ignores it.
  // =====================================================================================
  var pageUrl = body.dataset.url || '';
  var modOf = function () { var m = (body.className.match(/\bm-([A-Z]+)/) || [])[1]; return m || ''; };
  var pageTitle = function () { var t = document.querySelector('.wk-title'); return t ? t.textContent.trim() : document.title; };
  var pageLabel = function () { var id = document.querySelector('.wk-id span'); return (modOf() === 'CS' ? 'Clinical Skills ' : modOf() + ' ') + (id ? id.textContent.trim() : ''); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var logAct = function (field, n) {
    var a = lsGet('md3012:activity', {}), t = today();
    a[t] = a[t] || {}; a[t][field] = (a[t][field] || 0) + (n || 1); lsSet('md3012:activity', a);
  };
  var ui = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; e.setAttribute('data-ui', '1'); if (html != null) e.innerHTML = html; return e; };
  var isUI = function (n) { for (var e = n.nodeType === 1 ? n : n.parentElement; e; e = e.parentElement) { if (e.hasAttribute && e.hasAttribute('data-ui')) return true; if (e.tagName === 'MAIN') return false; } return false; };
  var textNodes = function (root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return isUI(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var out = [], pos = 0, n;
    while ((n = w.nextNode())) { out.push({ n: n, s: pos }); pos += n.nodeValue.length; }
    return { nodes: out, text: out.map(function (o) { return o.n.nodeValue; }).join('') };
  };
  var wrapText = function (root, start, end, mk) { // wrap [start,end) of root's (non-UI) text
    var tn = textNodes(root).nodes, made = [];
    tn.forEach(function (o) {
      var a = Math.max(start, o.s), b = Math.min(end, o.s + o.n.nodeValue.length);
      if (a >= b) return;
      var node = o.n;
      if (b - o.s < node.nodeValue.length) node.splitText(b - o.s);
      if (a - o.s > 0) node = node.splitText(a - o.s);
      var m = mk(); node.parentNode.insertBefore(m, node); m.appendChild(node); made.push(m);
    });
    return made;
  };
  var flash = function (el) { if (!el) return; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 2600); };

  // ---- abbreviations: tap for the full form (hover shows it too)
  var abPop = null;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('abbr.ab');
    if (abPop) { abPop.remove(); abPop = null; }
    if (!a) return;
    abPop = ui('div', 'ab-pop'); abPop.setAttribute('role', 'tooltip');
    abPop.innerHTML = '<b>' + escH(a.textContent) + '</b> ' + escH(a.getAttribute('title') || '');
    document.body.appendChild(abPop);
    var r = a.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 24);
    abPop.style.maxWidth = w + 'px';
    abPop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + window.scrollX - 10)) + 'px';
    abPop.style.top = (r.bottom + window.scrollY + 6) + 'px';
  });

  // ---- reading time + last activity (for Progress)
  if (notes) {
    var lastAct = Date.now();
    ['scroll', 'keydown', 'pointerdown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });
    setInterval(function () { if (document.visibilityState === 'visible' && Date.now() - lastAct < 90000) logAct('s', 15); }, 15000);
    var lastSeen = lsGet('md3012:last', {}); lastSeen[pageUrl] = Date.now(); lsSet('md3012:last', lastSeen);
  }

  // ---- bookmarks (☆ on every section heading)
  var BM = lsGet('md3012:bm', {});
  if (notes && pageUrl) {
    notes.querySelectorAll('section.sec > h1[id]').forEach(function (h) {
      var key = pageUrl + '#' + h.id, b = ui('button', 'bm');
      b.type = 'button';
      var paint = function () { var on = !!BM[key]; b.textContent = on ? '★' : '☆'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Remove bookmark' : 'Bookmark this section'); b.title = b.getAttribute('aria-label'); };
      paint();
      b.addEventListener('click', function () {
        BM = lsGet('md3012:bm', {});
        if (BM[key]) delete BM[key]; else BM[key] = { t: h.textContent.replace(/[☆★]/g, '').trim(), p: pageTitle(), l: pageLabel(), m: modOf(), at: Date.now() };
        lsSet('md3012:bm', BM); paint();
      });
      h.appendChild(b);
    });
  }

  // ---- highlights + margin notes
  var HL = lsGet('md3012:hl', {});
  var hlSave = function () { lsSet('md3012:hl', HL); };
  var hlList = function () { return HL[pageUrl] = HL[pageUrl] || []; };
  var hlPop = null;
  var closeHlPop = function () { if (hlPop) { hlPop.remove(); hlPop = null; } };
  var applyHl = function (h) {
    var sec = document.getElementById(h.sec); sec = sec && sec.closest('section.sec');
    if (!sec) return false;
    var tx = textNodes(sec).text, i = -1, best = -1, from = 0;
    while ((i = tx.indexOf(h.q, from)) > -1) { // pick the occurrence whose prefix matches best
      var pre = tx.slice(Math.max(0, i - h.pre.length), i), sc = 0;
      for (var k = 1; k <= pre.length && pre[pre.length - k] === h.pre[h.pre.length - k]; k++) sc++;
      if (best < 0 || sc > best[1]) best = [i, sc];
      from = i + 1;
    }
    if (best < 0) return false;
    wrapText(sec, best[0], best[0] + h.q.length, function () {
      var m = document.createElement('mark'); m.className = 'uhl' + (h.note ? ' has-note' : ''); m.dataset.hl = h.id;
      if (h.note) m.title = h.note; return m;
    });
    return true;
  };
  var removeHlMarks = function (id) {
    document.querySelectorAll('mark.uhl[data-hl="' + id + '"]').forEach(function (m) { var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
  };
  var openHlPop = function (h, anchor) {
    closeHlPop();
    hlPop = ui('div', 'hl-pop');
    hlPop.innerHTML = '<p class="hl-q">“' + escH(h.q.length > 140 ? h.q.slice(0, 137) + '…' : h.q) + '”</p>' +
      '<textarea rows="3" placeholder="Margin note (optional)">' + escH(h.note || '') + '</textarea>' +
      '<div class="hl-acts"><button type="button" class="btn solid" data-a="save">Save note</button><button type="button" class="btn" data-a="del">Remove highlight</button><button type="button" class="skip" data-a="x">Close</button></div>';
    document.body.appendChild(hlPop);
    var r = anchor.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24);
    hlPop.style.width = w + 'px';
    hlPop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + window.scrollX)) + 'px';
    hlPop.style.top = (r.bottom + window.scrollY + 8) + 'px';
    hlPop.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === 'save') {
        h.note = hlPop.querySelector('textarea').value.trim(); hlSave();
        document.querySelectorAll('mark.uhl[data-hl="' + h.id + '"]').forEach(function (m) { m.classList.toggle('has-note', !!h.note); m.title = h.note || ''; });
      } else if (a === 'del') {
        HL[pageUrl] = hlList().filter(function (x) { return x.id !== h.id; }); hlSave(); removeHlMarks(h.id);
      }
      closeHlPop();
    });
  };
  if (notes && pageUrl) {
    hlList().forEach(applyHl);
    var tb = ui('div', 'sel-bar'); tb.hidden = true;
    tb.innerHTML = '<button type="button" data-a="hl">Highlight</button><button type="button" data-a="note">Add note</button>';
    document.body.appendChild(tb);
    var pending = null;
    var readSel = function () {
      var s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) return null;
      var r = s.getRangeAt(0), q = s.toString();
      if (q.trim().length < 3 || q.length > 800) return null;
      var sa = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
      var sec = sa && sa.closest('main.notes section.sec'), sec2 = (r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentElement).closest('section.sec');
      if (!sec || sec !== sec2 || isUI(r.startContainer)) return null;
      var tn = textNodes(sec), start = -1;
      tn.nodes.forEach(function (o) { if (o.n === r.startContainer) start = o.s + r.startOffset; });
      var tx = tn.text;
      if (start < 0 || tx.slice(start, start + q.length) !== q) { start = tx.indexOf(q); if (start < 0) return null; }
      return { sec: sec, h1: sec.querySelector('h1'), q: q, start: start, pre: tx.slice(Math.max(0, start - 32), start), rect: r.getBoundingClientRect() };
    };
    var showBar = function () {
      pending = readSel();
      if (!pending) { tb.hidden = true; return; }
      tb.hidden = false;
      var r = pending.rect, w = tb.offsetWidth || 190;
      tb.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + window.scrollX + r.width / 2 - w / 2)) + 'px';
      tb.style.top = Math.max(window.scrollY + 8, r.top + window.scrollY - 48) + 'px';
    };
    var selT;
    document.addEventListener('selectionchange', function () { clearTimeout(selT); selT = setTimeout(showBar, 260); });
    tb.addEventListener('mousedown', function (e) { e.preventDefault(); });
    tb.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.a; if (!a || !pending) return;
      var h = { id: 'h' + Date.now().toString(36), sec: pending.h1.id, q: pending.q, pre: pending.pre, note: '', at: Date.now(), p: pageTitle(), l: pageLabel(), m: modOf(), st: pending.h1.textContent.replace(/[☆★]/g, '').trim() };
      hlList().push(h); hlSave();
      window.getSelection().removeAllRanges(); tb.hidden = true;
      applyHl(h);
      if (a === 'note') { var mk = document.querySelector('mark.uhl[data-hl="' + h.id + '"]'); if (mk) { openHlPop(h, mk); hlPop.querySelector('textarea').focus(); } }
    });
    notes.addEventListener('click', function (e) {
      var m = e.target.closest('mark.uhl'); if (!m) return;
      var h = hlList().filter(function (x) { return x.id === m.dataset.hl; })[0]; if (h) { e.stopPropagation(); openHlPop(h, m); }
    });
    document.addEventListener('click', function (e) { if (hlPop && !e.target.closest('.hl-pop') && !e.target.closest('mark.uhl') && !e.target.closest('.sel-bar')) closeHlPop(); });
    var mk = new URLSearchParams(location.search).get('mark');
    if (mk) setTimeout(function () { flash(document.querySelector('mark.uhl[data-hl="' + mk + '"]')); }, 400);
  }

  // ---- search jump: ?hl=word#section highlights the first match in that section
  var jq = new URLSearchParams(location.search).get('hl');
  if (notes && jq) {
    var tgt = location.hash && document.getElementById(location.hash.slice(1));
    var scope = (tgt && tgt.closest('section.sec')) || notes;
    var ttx = textNodes(scope).text.toLowerCase(), ji = ttx.indexOf(jq.toLowerCase());
    if (ji < 0 && tgt) { scope = notes; ttx = textNodes(notes).text.toLowerCase(); ji = ttx.indexOf(jq.toLowerCase()); }
    if (ji > -1) {
      var jm = wrapText(scope, ji, ji + jq.length, function () { var m = document.createElement('mark'); m.className = 'jump'; return m; });
      setTimeout(function () { flash(jm[0]); }, 350);
    }
  }

  // ---- explain it back (end of each topic section)
  var KEEPOUT = /^(LO map|Sources|Self-test|Quick reference|OSCE checklist)|worked case|cases|kahoot|menti|escape room|fishbowl/i;
  var exQuestion = function (title) { // used when a section has no learning objective in the LO map
    var t = title.replace(/\s+\+\s+/g, ' and ').replace(/:\s*/, ': ');
    var low = t.charAt(0).toLowerCase() + t.slice(1);
    if (/\bvs\.?\b|versus/i.test(t)) return 'Compare ' + low.replace(/\s+vs\.?\s+/i, ' and ') + ': what differs, and how would you tell them apart at the bedside?';
    if (/manag|treat|therap|drug|resuscitat/i.test(t)) return 'How would you manage this: ' + low + '? Give the first steps in order and why each matters.';
    if (/investig|diagnos|test|x-ray|ECG|imaging|assess/i.test(t)) return 'Walk through ' + low + ': what would you check or order, and what does each finding tell you?';
    if (/cause|risk|aetiolog|patholog|mechanism|why/i.test(t)) return 'Explain ' + low + ': the mechanism, the main causes, and how it shows up clinically.';
    return 'Explain ' + low + ': what it is, why it matters, and the one thing you would tell a colleague.';
  };
  if (notes && pageUrl) {
    var EX = lsGet('md3012:explain', {});
    notes.querySelectorAll('section.sec').forEach(function (sec) {
      var h = sec.querySelector('h1'); if (!h || KEEPOUT.test(h.textContent.trim())) return;
      var key = pageUrl + '#' + h.id;
      var title = h.textContent.replace(/[☆★]/g, '').replace(/^[\s①-⑳]+/, '').replace(/\(LO[^)]*\)/g, '').trim();
      var los = (h.dataset.explain || '').split(' | ').filter(Boolean).map(function (o) { o = o.replace(/\s+\+\s+/g, ' and ').replace(/\s*;\s*/g, '; '); return o.charAt(0).toUpperCase() + o.slice(1).replace(/[.\s]*$/, '.'); });
      var qs = los.length ? los : [exQuestion(title)];
      var d = ui('details', 'explain');
      d.innerHTML = '<summary>Explain it back</summary>' +
        (qs.length > 1 ? '<ol class="ex-qs">' + qs.map(function (q) { return '<li>' + escH(q) + '</li>'; }).join('') + '</ol>' : '<p class="ex-q">' + escH(qs[0]) + '</p>') +
        '<p class="ex-p">' + (los.length ? 'From this week’s learning objectives. ' : '') + 'Answer from memory; the notes above are covered while you write.</p>' +
        '<textarea rows="5" placeholder="In my own words…"></textarea><div class="acts"><button type="button" class="btn solid" data-a="cmp">Compare with the notes</button></div><div class="ex-out" hidden></div>';
      var ta = d.querySelector('textarea'), out = d.querySelector('.ex-out');
      ta.value = EX[key] || '';
      d.addEventListener('toggle', function () { sec.classList.toggle('covering', d.open && out.hidden); if (d.open) ta.focus({ preventScroll: true }); });
      ta.addEventListener('input', function () { EX = lsGet('md3012:explain', {}); EX[key] = ta.value; lsSet('md3012:explain', EX); });
      d.querySelector('[data-a=cmp]').addEventListener('click', function () {
        sec.classList.remove('covering');
        var mine = ta.value.toLowerCase(), terms = [], seen = {};
        sec.querySelectorAll('strong, b, .core, .y').forEach(function (s) {
          if (isUI(s)) return;
          var t = s.textContent.replace(/[:↳]/g, '').trim(); if (t.length < 3 || t.length > 40 || seen[t.toLowerCase()] || /^(link|menti q|menti|q|a|tip|note|remember|exam tip|answer|why|lecturer)$/i.test(t)) return;
          seen[t.toLowerCase()] = 1; terms.push(t);
        });
        terms = terms.slice(0, 14);
        var hit = 0, chips = terms.map(function (t) {
          var w = t.toLowerCase().split(/[^a-z0-9]+/).filter(function (x) { return x.length > 3; });
          var got = w.length && w.some(function (x) { return mine.indexOf(x.slice(0, 6)) > -1; }); if (got) hit++;
          return '<span class="key' + (got ? ' on' : '') + '">' + escH(t) + '</span>';
        });
        var pts = [];
        sec.querySelectorAll('li.ex, li.em, .note li').forEach(function (li) {
          if (isUI(li) || pts.length >= 6) return;
          var c = li.cloneNode(true); c.querySelectorAll('.said, .tag, ul, [data-ui]').forEach(function (x) { x.remove(); });
          var t = c.textContent.trim(); if (t) pts.push('<li>' + escH(t) + '</li>');
        });
        out.innerHTML = (terms.length ? '<p class="keys">Key terms you used: ' + hit + ' of ' + terms.length + ' ' + chips.join(' ') + '</p>' : '') +
          (pts.length ? '<p class="ex-h">The points the notes flag as exam / emphasis / pearls:</p><ul>' + pts.join('') + '</ul>' : '');
        out.hidden = false; logAct('ex', 1);
      });
      sec.appendChild(d);
    });
  }

  // ---- focus mode
  var fb_ = document.querySelector('.focus-btn');
  if (fb_) {
    var exitF = ui('button', 'focus-exit'); exitF.type = 'button'; exitF.textContent = 'Exit focus'; document.body.appendChild(exitF);
    var setF = function (on) { body.classList.toggle('focus', on); fb_.setAttribute('aria-pressed', String(on)); lsSet('md3012:focus', on); };
    setF(!!lsGet('md3012:focus', false));
    fb_.addEventListener('click', function () { setF(!body.classList.contains('focus')); });
    exitF.addEventListener('click', function () { setF(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('focus') && !document.querySelector('.dg:not([hidden]), .osce:not([hidden])')) setF(false); });
  }

  // ---- cross-links: "Also in" at the end of each section
  if (notes && pageUrl) {
    loadData('xlinks').then(function (x) {
      var mine = x[pageUrl]; if (!mine) return;
      Object.keys(mine).forEach(function (sid) {
        var h = document.getElementById(sid), sec = h && h.closest('section.sec'); if (!sec) return;
        var p = ui('p', 'xlinks', '<span>Also in</span> ' + mine[sid].map(function (l) {
          return '<a class="m-' + l[4] + '" href="' + base + l[1] + '" title="' + escH(l[3]) + '"><b>' + escH(l[0]) + '</b> ' + escH(l[2]) + '</a>';
        }).join(''));
        var ex = sec.querySelector('details.explain'); sec.insertBefore(p, ex || null);
      });
    }).catch(function () {});
  }

  // ---- diagrams: label quiz + explore (Graphviz SVG versions of the generated diagrams)
  var STOPD = { the: 1, and: 1, for: 1, with: 1, from: 1, into: 1, then: 1, this: 1, that: 1, only: 1, more: 1, less: 1 };
  var dg = null;
  var openDiagram = function (img, mode) {
    if (!dg) {
      dg = ui('div', 'dg'); dg.setAttribute('role', 'dialog'); dg.setAttribute('aria-modal', 'true'); dg.hidden = true;
      dg.innerHTML = '<div class="dg-box"><header><div class="dg-tabs"><button type="button" data-m="quiz">Label quiz</button><button type="button" data-m="explore">Explore</button></div>' +
        '<span class="dg-n"></span><button type="button" class="dg-x" aria-label="Close">×</button></header><div class="dg-main"><div class="dg-svg"></div><div class="dg-foot"></div></div></div>';
      document.body.appendChild(dg);
      dg.querySelector('.dg-x').addEventListener('click', function () { dg.hidden = true; body.classList.remove('zoomed'); });
      dg.addEventListener('click', function (e) { if (e.target === dg) { dg.hidden = true; body.classList.remove('zoomed'); } });
      document.addEventListener('keydown', function (e) {
        if (!dg || dg.hidden) return;
        if (e.key === 'Escape') { dg.hidden = true; body.classList.remove('zoomed'); }
        if (dg.dataset.mode === 'explore' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { var b = dg.querySelector('[data-f=' + (e.key === 'ArrowRight' ? 'next' : 'prev') + ']'); if (b && !b.disabled) b.click(); }
      });
    }
    var box = dg.querySelector('.dg-svg'), foot = dg.querySelector('.dg-foot'), cnt = dg.querySelector('.dg-n');
    var sec = img.closest('section.sec');
    var setMode = function (md) {
      dg.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === md)); });
      var svg = box.querySelector('svg'); if (!svg) return;
      svg.querySelectorAll('.cover').forEach(function (c) { c.remove(); });
      svg.classList.remove('focusing');
      svg.querySelectorAll('g.node, g.edge').forEach(function (g) { g.classList.remove('hid', 'sel', 'nb', 'hl'); });
      var secLines = sec ? Array.prototype.filter.call(sec.querySelectorAll('li, p, td'), function (el) { return !isUI(el) && !el.closest('figure, .lgd, .figwrap, details'); }) : [];
      var labelOf = function (g) { return Array.prototype.map.call(g.querySelectorAll('text'), function (t) { return t.textContent; }).join(' ').replace(/\s+/g, ' ').trim(); };
      if (md === 'quiz') {
        var nodes = Array.prototype.filter.call(svg.querySelectorAll('g.node'), function (g) { return labelOf(g); }), cur = null, lvl = 0;
        nodes.forEach(function (g) {
          var t = g.querySelectorAll('text');
          var bb = null; t.forEach(function (x) { var b = x.getBBox(); bb = bb ? { x: Math.min(bb.x, b.x), y: Math.min(bb.y, b.y), x2: Math.max(bb.x2, b.x + b.width), y2: Math.max(bb.y2, b.y + b.height) } : { x: b.x, y: b.y, x2: b.x + b.width, y2: b.y + b.height }; });
          var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          r.setAttribute('class', 'cover'); r.setAttribute('x', bb.x - 4); r.setAttribute('y', bb.y - 3); r.setAttribute('width', bb.x2 - bb.x + 8); r.setAttribute('height', bb.y2 - bb.y + 6); r.setAttribute('rx', 5);
          g.appendChild(r); g.classList.remove('done'); g.classList.add('hid');
        });
        var upd = function () { var n = svg.querySelectorAll('g.node.hid').length; cnt.textContent = (nodes.length - n) + ' of ' + nodes.length + ' revealed'; };
        var reveal = function (g) { g.classList.remove('hid', 'sel'); var c = g.querySelector('.cover'); if (c) c.remove(); g.classList.add('done'); upd(); };
        // hint 1: first letters + word lengths; hint 2: a line from the notes with the label blanked out
        var pattern = function (l) { return l.split(' ').map(function (w) { return w.replace(/^([^A-Za-z0-9]*[A-Za-z0-9])(.*)$/, function (m, a, rest) { return a + rest.replace(/[A-Za-z]/g, '_'); }); }).join('  '); };
        var clue = function (l) {
          var words = l.toLowerCase().split(/[^a-z0-9α-ω\-]+/).filter(function (w) { return w.length > 2 && !STOPD[w]; });
          if (!words.length) return null;
          var best = null, bn = 0;
          secLines.forEach(function (el) {
            var t = el.textContent.replace(/\s+/g, ' ').trim(), lt = t.toLowerCase(), n = 0;
            if (t.length > 300 || t.length < 15) return;
            words.forEach(function (w) { if (lt.indexOf(w) > -1) n++; });
            if (n > bn) { bn = n; best = t; }
          });
          if (!best || bn < Math.min(2, words.length)) return null;
          words.forEach(function (w) { best = best.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '_____'); });
          return best;
        };
        var paint = function () {
          if (!cur) {
            foot.innerHTML = '<p>Tap a hidden box to choose it, try to name it, then use a hint or show it.</p><div class="acts"><button type="button" class="btn" data-f="all">Reveal all</button><button type="button" class="btn" data-f="reset">Hide all again</button></div>';
            return;
          }
          var l = labelOf(cur), c = lvl >= 2 ? clue(l) : null;
          foot.innerHTML = '<p class="dg-l">Name this box</p>' +
            (lvl >= 1 ? '<p class="dg-hint">Hint: <code>' + escH(pattern(l)) + '</code> (' + l.split(' ').length + (l.split(' ').length > 1 ? ' words' : ' word') + ')</p>' : '') +
            (lvl >= 2 ? '<p class="dg-hint">' + (c ? 'From your notes: “' + escH(c.length > 220 ? c.slice(0, 217) + '…' : c) + '”' : 'No line in this section names it directly; try the arrows in and out of the box.') + '</p>' : '') +
            '<div class="acts">' + (lvl < 2 ? '<button type="button" class="btn" data-f="hint">' + (lvl ? 'Another hint' : 'Hint') + '</button>' : '') +
            '<button type="button" class="btn solid" data-f="show">Show it</button><button type="button" class="skip" data-f="none">Pick another box</button></div>';
        };
        upd(); paint();
        svg.onclick = function (e) {
          var g = e.target.closest('g.node'); if (!g || !g.classList.contains('hid')) return;
          if (cur === g) { reveal(g); cur = null; lvl = 0; paint(); return; } // second tap reveals
          if (cur) cur.classList.remove('sel');
          cur = g; lvl = 0; g.classList.add('sel'); paint();
        };
        foot.onclick = function (e) {
          var f = e.target.dataset && e.target.dataset.f; if (!f) return;
          if (f === 'hint') { lvl++; paint(); }
          if (f === 'show' && cur) { reveal(cur); cur = null; lvl = 0; paint(); }
          if (f === 'none') { if (cur) cur.classList.remove('sel'); cur = null; paint(); }
          if (f === 'all') { nodes.forEach(function (g) { if (g.classList.contains('hid')) reveal(g); }); cur = null; paint(); }
          if (f === 'reset') { setMode('quiz'); logAct('dg', 1); }
        };
      } else {
        // ---------- Explore: role, connections, notes from the whole page, other weeks, a practice question, walk-through
        var gnodes = Array.prototype.filter.call(svg.querySelectorAll('g.node'), function (g) { return labelOf(g); }), ids = {};
        gnodes.forEach(function (g) { var t = g.querySelector('title'); if (t) ids[t.textContent.trim()] = g; });
        var edges = Array.prototype.map.call(svg.querySelectorAll('g.edge'), function (e) {
          var t = ((e.querySelector('title') || {}).textContent || '').split(/->|--/), p = e.querySelector('path');
          var col = ((p && p.getAttribute('stroke')) || '').toLowerCase();
          return { el: e, a: ids[(t[0] || '').trim()], b: ids[(t[1] || '').trim()], block: /d2453a|dc2626|c62828|#f00|red/.test(col),
            dashed: !!(p && p.getAttribute('stroke-dasharray')), lab: Array.prototype.map.call(e.querySelectorAll('text'), function (x) { return x.textContent; }).join(' ').trim() };
        }).filter(function (x) { return x.a && x.b && x.a !== x.b; });
        // colour key next to the diagram -> what each box colour means
        var host = img.closest('.figwrap') || img.closest('figure') || img.parentNode, lgd = host && (host.querySelector('.lgd') || (host.nextElementSibling && host.nextElementSibling.classList && host.nextElementSibling.classList.contains('lgd') ? host.nextElementSibling : null));
        var hex = function (c) { var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map(function (x) { return ('0' + (+x).toString(16)).slice(-2); }).join('') : (c || '').toLowerCase(); };
        var roles = [];
        if (lgd) lgd.querySelectorAll('.li').forEach(function (li) {
          var sw = li.querySelector('.sw'); if (!sw) return;
          var bg = sw.style.background || sw.style.backgroundColor || (sw.classList.contains('def') ? getComputedStyle(sw).backgroundColor : '');
          if (bg) roles.push([hex(bg), li.textContent.trim()]);
        });
        var roleOf = function (g) { var sh = g.querySelector('path, polygon, ellipse'), f = ((sh && sh.getAttribute('fill')) || '').toLowerCase(); for (var i = 0; i < roles.length; i++) if (roles[i][0] === f) return roles[i][1]; return ''; };
        // flow order for the walk-through (ignore "blocks" arrows)
        var order = (function () {
          var indeg = new Map(), out = new Map(), res = [];
          gnodes.forEach(function (g) { indeg.set(g, 0); out.set(g, []); });
          edges.forEach(function (e) { if (!e.block) { indeg.set(e.b, indeg.get(e.b) + 1); out.get(e.a).push(e.b); } });
          var q = gnodes.filter(function (g) { return !indeg.get(g); });
          q.sort(function (x, y) { return x.getBBox().y - y.getBBox().y || x.getBBox().x - y.getBBox().x; });
          while (q.length) { var g = q.shift(); res.push(g); out.get(g).forEach(function (n) { indeg.set(n, indeg.get(n) - 1); if (!indeg.get(n)) q.push(n); }); }
          gnodes.forEach(function (g) { if (res.indexOf(g) < 0) res.push(g); });
          return res;
        })();
        // every line of the notes on this page (table rows kept whole), with its sub-heading for context
        var pageLines = [];
        Array.prototype.forEach.call(notes.querySelectorAll('li, p, tr'), function (el) {
          if (isUI(el) || el.closest('figure, .lgd, .figwrap, details, .abbr, .st, .cover, template, .quiz')) return;
          if (el.tagName === 'P' && el.closest('li, td')) return;
          var c = el.cloneNode(true); c.querySelectorAll('ul, ol, .said, [data-ui], .tag, .qn').forEach(function (x) { x.remove(); });
          var t = el.tagName === 'TR' ? Array.prototype.map.call(c.querySelectorAll('td, th'), function (x) { return x.textContent.trim(); }).filter(Boolean).join(' — ') : c.textContent;
          t = t.replace(/\s+/g, ' ').replace(/^[↳·•\s]+/, '').trim();
          if (t.length < 14 || t.length > 420 || el.querySelector('th')) return;
          var hs = el.closest('section.sec'), hh = hs && hs.querySelector('h1');
          if (el.tagName === 'TR' && hh && /^LO map/.test(hh.textContent.trim())) return;
          var ch = el.closest('.chunk, .note, .tip, .remember, .guide'), lab = ch && ch.querySelector('.lab, .clab');
          var sc = el.closest('section.sec'), h = sc && sc.querySelector('h1');
          pageLines.push({ el: el, t: t, lt: t.toLowerCase(), lab: lab && !lab.contains(el) ? lab.textContent.replace(/:\s*$/, '').trim() : '',
            sec: h ? h.textContent.replace(/[☆★]/g, '').trim() : '', secEl: sc, same: sc === sec, key: !!el.closest('li.ex, li.em, .note, .tip, .remember') });
        });
        // this page's own abbreviation key wins over the site-wide glossary (AA = arachidonic acid here, not elsewhere)
        var pageGl = {};
        notes.querySelectorAll('.abbr p').forEach(function (p) {
          if (!/Abbrev key/.test(p.textContent)) return;
          p.querySelectorAll('strong, b').forEach(function (st) {
            var k = st.textContent.trim(); if (/abbrev/i.test(k) || !/^[A-Za-z0-9][A-Za-z0-9+\-\/αβγ]{1,11}$/.test(k)) return;
            var e = '', n = st.nextSibling; while (n && !(n.nodeType === 1 && /^(STRONG|B)$/.test(n.tagName))) { e += n.textContent || ''; n = n.nextSibling; }
            e = e.replace(/\s+/g, ' ').replace(/^[\s·]+|[\s·.]+$/g, ''); if (e) pageGl[k] = e;
          });
        });
        var mergeGl = function (g) { var o = {}; Object.keys(g || {}).forEach(function (k) { o[k] = g[k]; }); Object.keys(pageGl).forEach(function (k) { o[k] = pageGl[k]; }); return o; };
        var gl = mergeGl((window.MD3012 || {}).glossary), IX = (window.MD3012 || {}).index || null;
        loadData('glossary').then(function (g) { gl = mergeGl(g); if (cur) show(cur, true); }).catch(function () {});
        loadData('index').then(function (x) { IX = x; if (cur) show(cur, true); }).catch(function () {});
        var esc_ = function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
        var sing = function (w) { return w.length > 4 && /[^s]s$/.test(w) ? w.slice(0, -1) : w; };
        // search terms for a label: its words (singular), plus abbreviations both ways (AA <-> arachidonic acid)
        var termsOf = function (l) {
          var low = l.toLowerCase(), out = [];
          var add = function (t, w) { t = t.toLowerCase().trim(); if (t.length > 1 && !STOPD[t] && !out.some(function (x) { return x.t === t; })) out.push({ t: t, w: w || 1 }); };
          low.split(/[^a-z0-9α-ω\-\/]+/).forEach(function (w) { w = w.replace(/^[\-\/]+|[\-\/]+$/g, ''); if (w.length > 2 && !STOPD[w]) add(sing(w)); });
          Object.keys(gl).forEach(function (k) {
            var e = String(gl[k]).toLowerCase();
            if (new RegExp('(^|[^a-z0-9])' + esc_(k.toLowerCase()) + '([^a-z0-9]|$)').test(low)) { add(k, 1.2); if (e.length < 40) add(e, 1.2); }
            else if (e.length > 5 && e.length < 40 && low.indexOf(e) > -1) add(k, e.length >= low.replace(/[^a-z0-9 ]/g, '').trim().length * 0.6 ? 2.2 : 1.2); // the label IS this abbreviation
          });
          return out;
        };
        var rx = {};
        var hasT = function (lt, t) { var r = rx[t] || (rx[t] = new RegExp('(^|[^a-z0-9])' + esc_(t) + (t.length > 3 ? '' : '(?![a-z0-9])'))); return r.test(lt); };
        var df = {};
        var weigh = function (ts) {
          ts.forEach(function (x) { if (df[x.t] == null) { df[x.t] = 0; pageLines.forEach(function (o) { if (hasT(o.lt, x.t)) df[x.t]++; }); } x.idf = x.w / Math.log(2 + df[x.t]); });
          return ts.filter(function (x) { return df[x.t] > 0; }).length ? ts.filter(function (x) { return df[x.t] > 0 || x.t.indexOf(' ') < 0; }) : ts; // words never used on this page can't anchor the ranking
        };
        var topOf = function (ts) { var on = ts.filter(function (x) { return df[x.t] > 0; }); return Math.max.apply(null, (on.length ? on : ts).map(function (x) { return x.idf; }).concat([0.0001])); };
        var notesFor = function (ts) {
          if (!ts.length) return [];
          var top = topOf(ts);
          return pageLines.map(function (o) {
            var sc = 0; ts.forEach(function (x) { if (hasT(o.lt, x.t)) sc += x.idf; });
            var len = o.t.length, lenB = len < 30 ? -0.25 : len < 60 ? 0 : 0.2;
            return { o: o, raw: sc, sc: sc * (o.same ? 1.5 : 1) * (o.key ? 1.25 : 1) + lenB * top };
          }).filter(function (x) { return x.raw >= top * 0.75; }).sort(function (x, y) { return y.sc - x.sc; }).slice(0, 6);
        };
        // the section this box is mainly about (its title names the box)
        var mainSection = function (ts) {
          var best = null, bs = 0, top = topOf(ts);
          notes.querySelectorAll('section.sec').forEach(function (sc) {
            var h = sc.querySelector('h1'); if (!h || /^(LO map|Quick reference|Self-test|Sources)/.test(h.textContent.trim())) return;
            var lt = h.textContent.toLowerCase(), s1 = 0; ts.forEach(function (x) { if (hasT(lt, x.t)) s1 += x.idf; });
            if (s1 > bs) { bs = s1; best = sc; }
          });
          if (!best || bs < top * 0.75) return null;
          var pts = [];
          best.querySelectorAll('li.ex, li.em, .note li, .remember li').forEach(function (li) {
            if (isUI(li) || pts.length >= 4) return;
            var c = li.cloneNode(true); c.querySelectorAll('.said, .tag, ul, [data-ui]').forEach(function (x) { x.remove(); });
            var t = c.textContent.replace(/\s+/g, ' ').replace(/^[↳·•\s]+/, '').trim(); if (t.length > 12) pts.push(t);
          });
          var labs = Array.prototype.map.call(best.querySelectorAll('.lab'), function (x) { return x.textContent.replace(/:\s*$/, '').trim(); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 6);
          return { el: best, h: best.querySelector('h1').textContent.replace(/[☆★]/g, '').trim(), pts: pts, labs: labs };
        };
        var hlw = function (t, ts) { var h = escH(t); ts.forEach(function (x) { if (x.t.length > 1) h = h.replace(new RegExp('(^|[^A-Za-z0-9])(' + esc_(x.t) + ')', 'ig'), '$1<mark>$2</mark>'); }); return h; };
        var name = function (g) { return labelOf(g); };
        var cur = null, walking = false, hits = [], mainS = null;
        var clearHl = function () {
          svg.classList.remove('focusing');
          svg.querySelectorAll('.sel, .nb, .hl').forEach(function (x) { x.classList.remove('sel', 'nb', 'hl'); });
        };
        var overview = function () {
          clearHl(); cur = null; walking = false;
          cnt.textContent = gnodes.length + ' boxes';
          var cap = img.closest('figure') && img.closest('figure').querySelector('figcaption');
          foot.innerHTML = '<p class="dg-l">' + escH(cap ? cap.textContent : 'Explore this diagram') + '</p>' +
            '<p>Tap any box for its role, what feeds into it and what it leads to, the section that covers it, the key lines from your notes, other weeks that cover it and a practice question.</p>' +
            (roles.length ? '<p class="ex-key">' + roles.map(function (r) { return '<span><i style="background:' + r[0] + '"></i>' + escH(r[1]) + '</span>'; }).join('') + '</p>' : '') +
            '<div class="acts"><button type="button" class="btn solid" data-f="walk">Walk through it in order</button></div>' +
            '<p class="ex-h">Boxes, in flow order</p><p class="ex-chips">' + order.map(function (g, i) { return '<button type="button" data-n="' + i + '">' + escH(name(g)) + '</button>'; }).join('') + '</p>';
        };
        var show = function (g, keepScroll) {
          var st = foot.scrollTop;
          cur = g; clearHl(); svg.classList.add('focusing'); g.classList.add('sel');
          var l = name(g), ts = weigh(termsOf(l)), role = roleOf(g), i0 = order.indexOf(g);
          var inc = edges.filter(function (e) { return e.b === g; }), outg = edges.filter(function (e) { return e.a === g; });
          inc.concat(outg).forEach(function (e) { e.el.classList.add('hl'); (e.a === g ? e.b : e.a).classList.add('nb'); });
          var nb = function (list, end) { return list.map(function (e) { var n = end === 'a' ? e.a : e.b; return '<button type="button" class="ex-nb" data-n="' + order.indexOf(n) + '">' + escH(name(n)) + '</button>' + (e.lab ? ' <small>(' + escH(e.lab) + ')</small>' : '') + (e.dashed ? ' <small>(partly)</small>' : ''); }).join(' '); };
          var rows = [];
          var from = inc.filter(function (e) { return !e.block; }), by = inc.filter(function (e) { return e.block; }), to = outg.filter(function (e) { return !e.block; }), blocks = outg.filter(function (e) { return e.block; });
          if (from.length) rows.push('<li><b>Comes from</b> ' + nb(from, 'a') + '</li>');
          if (to.length) rows.push('<li><b>Leads to</b> ' + nb(to, 'b') + '</li>');
          if (by.length) rows.push('<li><b>Blocked by</b> ' + nb(by, 'a') + '</li>');
          if (blocks.length) rows.push('<li><b>Blocks</b> ' + nb(blocks, 'b') + '</li>');
          var ab = Object.keys(gl).filter(function (k) { return new RegExp('(^|[^A-Za-z0-9])' + esc_(k) + '([^A-Za-z0-9]|$)').test(l); }).slice(0, 4);
          // drug / condition index entries named in the label
          var ixh = '';
          if (IX) {
            var low = l.toLowerCase(), found = [];
            ['drugs', 'conditions'].forEach(function (kind) { (IX[kind] || []).forEach(function (e) {
              var n = e.n.toLowerCase(); if (found.length < 2 && n.length > 3 && (new RegExp('(^|[^a-z])' + esc_(n) + 's?([^a-z]|$)').test(low))) found.push([kind, e]);
            }); });
            ixh = found.map(function (f) { var e = f[1];
              return '<div class="ex-ix"><p><a href="' + base + f[0] + '.html#' + e.id + '"><b>' + escH(e.n) + '</b></a>' + (e.c ? ' <span class="ex-role">' + escH(e.c) + '</span>' : '') + '</p>' +
                (e.s.length ? '<ul>' + e.s.map(function (x) { return '<li>' + hlw(x, ts) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
            }).join('');
          }
          mainS = mainSection(ts);
          hits = notesFor(ts).filter(function (x) { return !mainS || x.o.secEl !== mainS.el || !mainS.pts.some(function (p) { return p === x.o.t; }); });
          var here = hits.filter(function (x) { return x.o.same; }), other = hits.filter(function (x) { return !x.o.same; });
          var li = function (x) { var i = hits.indexOf(x); return '<li><button type="button" class="linkish" data-go="' + i + '">' + hlw(x.o.t, ts) + '</button>' + (x.o.lab || !x.o.same ? '<span class="ex-ctx">' + escH([x.o.lab, x.o.same ? '' : x.o.sec].filter(Boolean).join(' · ')) + '</span>' : '') + '</li>'; };
          cnt.textContent = walking ? 'Step ' + (i0 + 1) + ' of ' + order.length : (i0 + 1) + ' of ' + order.length;
          foot.innerHTML = (walking ? '<div class="acts ex-walk"><button type="button" class="btn" data-f="prev"' + (i0 ? '' : ' disabled') + '>← Back</button><button type="button" class="btn solid" data-f="next"' + (i0 < order.length - 1 ? '' : ' disabled') + '>Next box →</button><button type="button" class="skip" data-f="stop">Stop</button></div>' : '') +
            '<div class="ex-top"><p class="dg-l">' + escH(l) + '</p>' + (role ? '<span class="ex-role">' + escH(role) + '</span>' : '') + '</div>' +
            (ab.length ? '<p class="ex-ab">' + ab.map(function (k) { return '<b>' + escH(k) + '</b> = ' + escH(gl[k]); }).join(' · ') + '</p>' : '') +
            (rows.length ? '<ul class="ex-links">' + rows.join('') + '</ul>' : '') +
            ixh +
            (mainS ? '<div class="ex-main"><p class="ex-h">Main section: <button type="button" class="linkish" data-f="sec">' + escH(mainS.h) + '</button></p>' +
              (mainS.pts.length ? '<ul>' + mainS.pts.map(function (p) { return '<li>' + hlw(p, ts) + '</li>'; }).join('') + '</ul>' : '') +
              (mainS.labs.length ? '<p class="ex-ctx">Covers: ' + escH(mainS.labs.join(' · ')) + '</p>' : '') + '</div>' : '') +
            (here.length ? '<p class="ex-h">In this section</p><ul class="ex-notes">' + here.map(li).join('') + '</ul>' : '') +
            (other.length ? '<p class="ex-h">Elsewhere this week</p><ul class="ex-notes">' + other.map(li).join('') + '</ul>' : '') +
            (!here.length && !other.length && !mainS && !ixh ? '<p class="ex-none">Nothing else on this page names it directly; the arrows above show where it fits.</p>' : '') +
            '<div class="ex-else"></div><div class="ex-q"></div>' +
            (walking ? '' : '<div class="acts"><button type="button" class="skip" data-f="back">All boxes</button><button type="button" class="skip" data-f="walk">Walk through from here</button></div>');
          if (keepScroll) foot.scrollTop = st; else foot.scrollTop = 0;
          var tp = topOf(ts), strongT = ts.filter(function (x) { return x.idf >= tp * 0.75; });
          loadData('search').then(function (recs) {
            if (cur !== g || !strongT.length) return;
            var best = recs.filter(function (r) { return !r.img && r.u.split('#')[0] !== pageUrl && !/^(LO map|Self-test|Quick reference|Sources)/.test(r.s); }).map(function (r) {
              var s1 = r.s.toLowerCase(), t1 = r.t.toLowerCase(), sc = 0;
              ts.forEach(function (x) { if (hasT(s1, x.t)) sc += 3 * x.idf; if (hasT(t1, x.t)) sc += x.idf; });
              var inTitle = strongT.some(function (x) { return hasT(s1, x.t); });
              var nT = ts.filter(function (x) { return hasT(s1, x.t) || hasT(t1, x.t); }).length;
              var strong = inTitle || (nT >= Math.max(Math.min(2, ts.length), Math.ceil(ts.length * 0.75)) && strongT.some(function (x) { return hasT(t1, x.t); }));
              return { r: r, sc: strong ? sc + (inTitle ? 5 : 0) : 0 };
            }).filter(function (x) { return x.sc > 0; }).sort(function (x, y) { return y.sc - x.sc; }).slice(0, 4);
            if (best.length) foot.querySelector('.ex-else').innerHTML = '<p class="ex-h">Other weeks</p><p class="ex-chips">' + best.map(function (x) {
              return '<a class="m-' + x.r.m + '" href="' + base + x.r.u.split('#')[0] + '?hl=' + encodeURIComponent(strongT[0].t) + '#' + (x.r.u.split('#')[1] || '') + '"><b>' + escH(label(x.r)) + '</b> ' + escH(x.r.s.replace(/^[①-⑳\s]+/, '')) + '</a>';
            }).join('') + '</p>';
          }).catch(function () {});
          loadData('practice').then(function (items) {
            if (cur !== g || !strongT.length) return;
            var k = body.dataset.key, best = null, bs = 0;
            items.forEach(function (it) {
              var t1 = (it.q + ' ' + it.a).toLowerCase(), sc = 0, nT = 0; ts.forEach(function (x) { if (hasT(t1, x.t)) { sc += x.idf; nT++; } });
              if (!strongT.some(function (x) { return hasT(t1, x.t); }) || nT < Math.min(2, ts.length)) return;
              sc += it.k === k ? 0.6 : 0;
              if (sc > bs) { bs = sc; best = it; }
            });
            if (best) foot.querySelector('.ex-q').innerHTML = '<p class="ex-h">Test yourself</p><div class="ex-test"><p>' + best.q + '</p><button type="button" class="linkish" data-f="ans">Show answer</button><p class="ex-ans" hidden>' + best.a + '</p></div>';
          }).catch(function () {});
        };
        overview();
        svg.onclick = function (e) { var g = e.target.closest('g.node'); if (g && labelOf(g)) show(g); };
        foot.onclick = function (e) {
          var t = e.target.closest('[data-f], [data-n], [data-go]'); if (!t) return;
          if (t.dataset.go != null) { dg.hidden = true; body.classList.remove('zoomed'); flash(hits[+t.dataset.go].o.el); return; }
          if (t.dataset.f === 'sec' && mainS) { dg.hidden = true; body.classList.remove('zoomed'); mainS.el.querySelector('h1').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
          if (t.dataset.f === 'sec' && mainS) { dg.hidden = true; body.classList.remove('zoomed'); mainS.el.querySelector('h1').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
          if (t.dataset.n != null) { show(order[+t.dataset.n]); return; }
          var f = t.dataset.f, i0 = order.indexOf(cur);
          if (f === 'walk') { walking = true; show(cur && i0 > -1 ? cur : order[0]); logAct('dg', 1); }
          if (f === 'next' && i0 < order.length - 1) show(order[i0 + 1]);
          if (f === 'prev' && i0 > 0) show(order[i0 - 1]);
          if (f === 'stop') { walking = false; show(cur); }
          if (f === 'back') overview();
          if (f === 'ans') { var a = foot.querySelector('.ex-ans'); a.hidden = !a.hidden; t.textContent = a.hidden ? 'Show answer' : 'Hide answer'; }
        };
        foot.onkeydown = null;
      }
      dg.dataset.mode = md;
    };
    dg.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { setMode(b.dataset.m); }; });
    var tpl = document.getElementById(img.dataset.dg);
    box.innerHTML = '';
    box.appendChild(document.importNode(tpl.content, true));
    var svg0 = box.querySelector('svg'); svg0.removeAttribute('width'); svg0.removeAttribute('height');
    dg.querySelector('[data-m=quiz]').hidden = !img.dataset.quiz;
    dg.hidden = false; body.classList.add('zoomed');
    setMode(mode);
  };
  if (notes) notes.querySelectorAll('img[data-dg]').forEach(function (img) {
    var bar = ui('div', 'dg-tools', (img.dataset.quiz ? '<button type="button" data-m="quiz">Label quiz</button>' : '') + '<button type="button" data-m="explore">Explore this diagram</button>');
    var host = img.closest('figure, .figwrap, p') || img;
    host.parentNode.insertBefore(bar, host.nextSibling);
    bar.addEventListener('click', function (e) { var m = e.target.dataset && e.target.dataset.m; if (m) openDiagram(img, m); });
  });

  // ---- OSCE station mode (Clinical Skills checklists)
  if (notes) notes.querySelectorAll('section.sec').forEach(function (sec) {
    var h = sec.querySelector('h1'); if (!h || !/OSCE/i.test(h.textContent)) return;
    sec.querySelectorAll('.chunk').forEach(function (ch) {
      var lab = ch.querySelector('.lab'), steps = ch.querySelectorAll('li.step, li');
      if (!lab || steps.length < 3) return;
      var name = lab.textContent.replace(/:$/, '').trim();
      var b = ui('button', 'btn osce-go'); b.type = 'button'; b.textContent = 'Run this station';
      lab.parentNode.appendChild(b);
      b.addEventListener('click', function () { runOsce(name, Array.prototype.map.call(steps, function (li) { var c = li.cloneNode(true); c.querySelectorAll('[data-ui], .said').forEach(function (x) { x.remove(); }); return c.textContent.trim(); })); });
    });
  });
  var runOsce = function (name, steps) {
    var ov = ui('div', 'osce'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var hist = lsGet('md3012:osce', {})[name] || [];
    var last = hist.length ? hist[hist.length - 1] : null;
    ov.innerHTML = '<div class="dg-box osce-box"><header><strong>' + escH(name) + '</strong><span class="os-t">8:00</span><button type="button" class="dg-x" aria-label="Close">×</button></header>' +
      '<div class="os-set"><label>Time <select><option value="300">5 min</option><option value="480" selected>8 min</option><option value="600">10 min</option></select></label>' +
      '<label class="os-rec"><input type="checkbox"> Recall mode (steps hidden until tapped)</label><button type="button" class="btn solid" data-a="start">Start</button></div>' +
      '<ol class="os-steps">' + steps.map(function (s, i) { return '<li><button type="button" data-i="' + i + '"><span class="os-c"></span><span class="os-x">' + escH(s.replace(/^[①-⑳]\s*/, '')) + '</span></button></li>'; }).join('') + '</ol>' +
      '<div class="os-foot"><button type="button" class="btn solid" data-a="end">Finish station</button>' + (last ? '<span class="os-last">Last time: ' + last.score + ' of ' + last.total + '</span>' : '') + '</div><div class="os-res" hidden></div></div>';
    document.body.appendChild(ov); body.classList.add('zoomed');
    var tEl = ov.querySelector('.os-t'), sel = ov.querySelector('select'), rec = ov.querySelector('.os-rec input'), list = ov.querySelector('.os-steps');
    var left = 480, timer = null, started = 0;
    var fmt = function (s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    sel.addEventListener('change', function () { left = +sel.value; tEl.textContent = fmt(left); });
    rec.addEventListener('change', function () { list.classList.toggle('recall', rec.checked); });
    var close = function () { clearInterval(timer); ov.remove(); body.classList.remove('zoomed'); };
    ov.querySelector('.dg-x').addEventListener('click', close);
    ov.addEventListener('click', function (e) {
      var a = e.target.dataset && e.target.dataset.a;
      var st = e.target.closest('[data-i]');
      if (st) { st.parentNode.classList.toggle('done'); return; }
      if (a === 'start' && !timer) {
        started = Date.now(); e.target.textContent = 'Running…'; e.target.disabled = true;
        timer = setInterval(function () { left--; tEl.textContent = fmt(Math.max(0, left)); if (left <= 0) { clearInterval(timer); tEl.classList.add('over'); tEl.textContent = 'Time'; } }, 1000);
      }
      if (a === 'end') {
        clearInterval(timer);
        var done = list.querySelectorAll('li.done').length, secs = started ? Math.round((Date.now() - started) / 1000) : 0;
        var all = lsGet('md3012:osce', {}); (all[name] = all[name] || []).push({ at: Date.now(), score: done, total: steps.length, secs: secs }); lsSet('md3012:osce', all);
        logAct('osce', 1);
        var res = ov.querySelector('.os-res');
        res.innerHTML = '<p class="verdict">' + done + ' of ' + steps.length + ' steps' + (secs ? ' in ' + fmt(secs) : '') + '.</p>' +
          (done < steps.length ? '<p>Missed: ' + Array.prototype.filter.call(list.querySelectorAll('li'), function (li) { return !li.classList.contains('done'); }).map(function (li) { return escH(li.textContent.trim()); }).join('; ') + '</p>' : '<p>Every step done.</p>');
        res.hidden = false; list.classList.remove('recall');
      }
    });
  };

  // ---- mnemonics page: test-me with line-by-line reveal (tap = next letter), or show all
  var tm = document.querySelector('[data-testme]');
  if (tm) {
    var cards = document.querySelectorAll('.mn-card');
    var resetCard = function (c) { c.classList.remove('show'); c.querySelectorAll('.mn-items li.shown').forEach(function (li) { li.classList.remove('shown'); }); var n = c.querySelector('.mn-prog'); if (n) n.textContent = ''; };
    var progress = function (c) {
      var lis = c.querySelectorAll('.mn-items li'), n = c.querySelectorAll('.mn-items li.shown').length, p = c.querySelector('.mn-prog');
      if (p) p.textContent = lis.length ? n + ' of ' + lis.length : '';
      if (lis.length && n === lis.length) c.classList.add('show');
    };
    cards.forEach(function (c) {
      if (!c.querySelector('.mn-items, .mn-story')) return; // named-only cards: nothing to reveal
      var bar = ui('div', 'mn-ctl', '<span class="mn-prog"></span><button type="button" class="skip" data-a="all">Show all</button><button type="button" class="skip" data-a="reset">Hide again</button>');
      c.insertBefore(bar, c.querySelector('.mn-where'));
      bar.addEventListener('click', function (e) {
        var a = e.target.dataset && e.target.dataset.a; if (!a) return; e.stopPropagation();
        if (a === 'all') { c.querySelectorAll('.mn-items li').forEach(function (li) { li.classList.add('shown'); }); c.classList.add('show'); progress(c); }
        if (a === 'reset') resetCard(c);
      });
      c.addEventListener('click', function (e) {
        if (!body.classList.contains('testme') || e.target.closest('a, .mn-ctl')) return;
        var next = c.querySelector('.mn-items li:not(.shown)');
        if (next) { next.classList.add('shown'); progress(c); }
        else if (!c.querySelector('.mn-items li')) c.classList.toggle('show'); // memory stories: reveal whole
        else resetCard(c);
      });
    });
    tm.addEventListener('click', function () {
      var on = !body.classList.contains('testme'); body.classList.toggle('testme', on); tm.setAttribute('aria-pressed', String(on));
      cards.forEach(resetCard);
      var hint = document.querySelector('.mn-hint'); if (hint) hint.hidden = !on;
    });
  }

  // ---- image rounds
  var iroot = document.getElementById('images');
  if (iroot) {
    var IR = [], ist = lsGet('md3012:img', {}), imods = {}, irecent = [], isess = { n: 0, ok: 0 }, icur = null, ians = false;
    var icard = iroot.querySelector('.ir-card'), iimg = icard.querySelector('.ir-img img'), iopts = icard.querySelector('.opts'), ifb = icard.querySelector('.fb'), inext = icard.querySelector('[data-act=next]'), istat = iroot.querySelector('.qstats');
    var ipool = function () { var any = Object.keys(imods).some(function (m) { return imods[m]; }); return IR.filter(function (q) { return !any || imods[q.m]; }); };
    var inextQ = function () {
      var all = ipool(), p = all.filter(function (q) { return irecent.indexOf(q.img) < 0; }); if (!p.length) p = all;
      if (!p.length) { icard.hidden = true; return; }
      icard.hidden = false;
      var tot = 0, ws = p.map(function (q) { var s = ist[q.img], w = !s ? 2 : (s[3] === 0 ? 5 : 1 / (1 + s[0])); tot += w; return w; }), r = Math.random() * tot, i = 0;
      for (; i < p.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
      icur = p[i]; irecent.push(icur.img); if (irecent.length > 15) irecent.shift(); ians = false;
      icard.className = 'qcard ir-card m-' + icur.m;
      iimg.src = base + icur.img;
      iopts.innerHTML = icur.o.map(function (o, k) { return '<li><button type="button" class="opt" data-k="' + k + '"><span class="ol">' + 'ABCDE'[k] + '</span><span class="ot">' + escH(o) + '</span></button></li>'; }).join('');
      ifb.hidden = true; inext.hidden = true;
      istat.textContent = all.length + ' images in this set · this session: ' + isess.n + ' answered, ' + isess.ok + ' correct';
    };
    iopts.addEventListener('click', function (e) {
      var b = e.target.closest('.opt'); if (!b || ians) return; ians = true;
      var k = +b.dataset.k, ok = k === icur.c;
      iopts.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; if (+x.dataset.k === icur.c) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      var s = ist[icur.img] || [0, 0, 0, 1]; if (ok) s[0]++; else s[1]++; s[2] = Date.now(); s[3] = ok ? 1 : 0; ist[icur.img] = s; lsSet('md3012:img', ist);
      isess.n++; if (ok) isess.ok++; logAct('q', 1);
      ifb.className = 'fb ' + (ok ? 'yes' : 'no');
      ifb.innerHTML = '<p class="verdict">' + (ok ? 'Correct.' : 'Not quite: it’s from “' + escH(icur.o[icur.c]) + '”.') + '</p>' +
        (icur.cap ? '<p>Caption: ' + escH(icur.cap) + '</p>' : '') + '<a class="from" href="' + base + icur.u + '">' + escH(label(icur) + ': ' + icur.wt) + ', see it in the notes</a>';
      ifb.hidden = false; inext.hidden = false; inext.focus({ preventScroll: true });
    });
    inext.addEventListener('click', inextQ); icard.querySelector('[data-act=skip]').addEventListener('click', inextQ);
    iimg.addEventListener('click', function () { var z = document.querySelector('.zoom'); if (z) { z.querySelector('img').src = iimg.src; z.hidden = false; body.classList.add('zoomed'); } });
    iroot.querySelectorAll('[data-mod]').forEach(function (b) { b.addEventListener('click', function () { imods[b.dataset.mod] = !imods[b.dataset.mod]; b.setAttribute('aria-pressed', String(!!imods[b.dataset.mod])); irecent = []; inextQ(); }); });
    document.addEventListener('keydown', function (e) {
      if (!icur || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      var k = 'abcde'.indexOf(e.key.toLowerCase()); if (k < 0) k = '12345'.indexOf(e.key);
      if (!ians && k > -1) { var o = iopts.querySelector('[data-k="' + k + '"]'); if (o) o.click(); } else if (ians && e.key === 'Enter') inextQ();
    });
    loadData('images').then(function (d) { IR = d; inextQ(); });
  }

  // ---- My notes page
  var mnOut = document.getElementById('mynotes-out');
  if (mnOut) {
    var bm = lsGet('md3012:bm', {}), hl = lsGet('md3012:hl', {}), ex = lsGet('md3012:explain', {});
    var html = '';
    var bks = Object.keys(bm).sort(function (a, b) { return bm[b].at - bm[a].at; });
    html += '<section class="mn-sec"><h2>Bookmarks <small>' + bks.length + '</small></h2>' + (bks.length ? '<ul class="my-list">' + bks.map(function (k) {
      var b = bm[k]; return '<li class="m-' + b.m + '"><a href="' + k + '"><span class="wk">' + escH(b.l || '') + '</span> ' + escH(b.t) + '</a><span class="wt2">' + escH(b.p || '') + '</span>' +
        '<button type="button" class="skip" data-unbm="' + escH(k) + '">Remove</button></li>';
    }).join('') + '</ul>' : '<p class="qempty">No bookmarks yet. Tap ☆ beside any section heading.</p>') + '</section>';
    var pages = Object.keys(hl).filter(function (p) { return hl[p].length; }), nh = 0;
    pages.forEach(function (p) { nh += hl[p].length; });
    html += '<section class="mn-sec"><h2>Highlights and margin notes <small>' + nh + '</small></h2>';
    html += pages.length ? pages.map(function (p) {
      var hs = hl[p].slice().sort(function (a, b) { return a.at - b.at; }), h0 = hs[0];
      return '<div class="my-page m-' + h0.m + '"><h3><a href="' + p + '">' + escH((h0.l || '') + ': ' + (h0.p || p)) + '</a></h3><ul class="my-list">' + hs.map(function (h) {
        return '<li><a class="my-q" href="' + p + '?mark=' + h.id + '#' + h.sec + '">“' + escH(h.q.length > 220 ? h.q.slice(0, 217) + '…' : h.q) + '”</a>' + (h.note ? '<p class="my-note">✎ ' + escH(h.note) + '</p>' : '') + '<span class="wt2">' + escH(h.st || '') + '</span></li>';
      }).join('') + '</ul></div>';
    }).join('') : '<p class="qempty">No highlights yet. Select any text in the notes, then tap Highlight or Add note.</p>';
    html += '</section>';
    var exk = Object.keys(ex).filter(function (k) { return ex[k] && ex[k].trim(); });
    if (exk.length) html += '<section class="mn-sec"><h2>Your “explain it back” answers <small>' + exk.length + '</small></h2><ul class="my-list">' + exk.map(function (k) { return '<li><a href="' + k + '">' + escH(k.split('#')[0]) + '</a><p class="my-note">' + escH(ex[k]) + '</p></li>'; }).join('') + '</ul></section>';
    mnOut.innerHTML = html;
    mnOut.addEventListener('click', function (e) { var k = e.target.dataset && e.target.dataset.unbm; if (k) { var b = lsGet('md3012:bm', {}); delete b[k]; lsSet('md3012:bm', b); e.target.closest('li').remove(); } });
  }

  // ---- Reset / backup (Progress page): everything this site saves lives in localStorage under md3012:*
  var SETTINGS_KEYS = ['md3012:theme', 'md3012:hy', 'md3012:focus'];
  var siteKeys = function () { var out = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('md3012:') === 0) out.push(k); } } catch (e) {} return out; };
  var resetCard = function () {
    var c = document.createElement('section'); c.className = 'pcard wide reset-card';
    c.innerHTML = '<h2>Reset</h2>' +
      '<div class="rs-row"><div><b>Reset settings</b><p>Back to the default look: light or dark follows your device, High-yield only and Focus off. Your progress and notes stay.</p></div>' +
      '<button type="button" class="btn" data-r="settings">Reset settings</button></div>' +
      '<div class="rs-row"><div><b>Reset everything</b><p>Clears everything this site has saved on this device: revised ticks, practice and image-round history, confidence, highlights, margin notes, bookmarks, explain-it-back answers, OSCE scores and activity. This can’t be undone, so download a backup first if you might want it back.</p></div>' +
      '<button type="button" class="btn danger" data-r="all">Reset everything</button></div>' +
      '<div class="rs-confirm" hidden><p></p><div class="acts"><button type="button" class="btn danger solid" data-r="yes">Yes, reset</button><button type="button" class="skip" data-r="no">Cancel</button></div></div>' +
      '<div class="rs-row"><div><b>Backup</b><p>Save your progress and notes as a file, or load one back (e.g. to move them to another browser or device).</p></div>' +
      '<div class="acts"><button type="button" class="btn" data-r="save">Download backup</button><label class="btn rs-load">Restore from file<input type="file" accept=".json,application/json" hidden></label></div></div>' +
      '<p class="rs-msg" role="status"></p>';
    var conf = c.querySelector('.rs-confirm'), msg = c.querySelector('.rs-msg'), pending = null;
    var say = function (t) { msg.textContent = t; };
    c.addEventListener('click', function (e) {
      var r = e.target.dataset && e.target.dataset.r; if (!r) return;
      if (r === 'settings' || r === 'all') {
        pending = r; conf.hidden = false;
        conf.querySelector('p').textContent = r === 'all'
          ? 'Delete everything this site has saved on this device (ticks, practice history, highlights, notes, bookmarks…)?'
          : 'Reset the display settings to default? Your progress and notes are kept.';
        conf.querySelector('[data-r=yes]').focus();
      }
      if (r === 'no') { conf.hidden = true; pending = null; }
      if (r === 'yes' && pending) {
        var keys = pending === 'all' ? siteKeys() : SETTINGS_KEYS;
        try { keys.forEach(function (k) { localStorage.removeItem(k); }); } catch (e2) {}
        conf.hidden = true;
        say(pending === 'all' ? 'Everything was reset. Reloading…' : 'Settings were reset. Reloading…');
        pending = null;
        setTimeout(function () { location.reload(); }, 700);
      }
      if (r === 'save') {
        var data = {}; siteKeys().forEach(function (k) { try { data[k] = localStorage.getItem(k); } catch (e3) {} });
        var blob = new Blob([JSON.stringify({ site: 'md3012-notes', saved: new Date().toISOString(), data: data }, null, 1)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'md3012-progress-' + today() + '.json';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        say('Backup downloaded.');
      }
    });
    c.querySelector('input[type=file]').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(rd.result), d = j && j.data;
          if (!d || j.site !== 'md3012-notes') throw new Error('not a backup');
          Object.keys(d).forEach(function (k) { if (k.indexOf('md3012:') === 0) localStorage.setItem(k, d[k]); });
          say('Restored from ' + f.name + '. Reloading…'); setTimeout(function () { location.reload(); }, 900);
        } catch (err) { say('That file isn’t an MD3012 notes backup, so nothing was changed.'); }
      };
      rd.readAsText(f);
    });
    return c;
  };

  // ---- Progress page
  var pOut = document.getElementById('progress-out');
  if (pOut) {
    loadData('meta').then(function (meta) {
      var docs = meta.docs, mods = ['TIN', 'EM', 'SSS', 'GH', 'CS'], st = lsGet('md3012:practice', {}), conf = lsGet('md3012:conf', {}), act = lsGet('md3012:activity', {});
      var bar = function (pct, cls) { return '<span class="pbar ' + (cls || '') + '"><i style="width:' + Math.round(Math.max(0, Math.min(1, pct)) * 100) + '%"></i></span>'; };
      var h = '<div class="pgrid">';
      // revised
      var rv = docs.filter(function (d) { return done[d.k]; }).length;
      h += '<section class="pcard"><h2>Weeks revised</h2><p class="big">' + rv + ' <small>of ' + docs.length + '</small></p>' + mods.map(function (m) {
        var ds = docs.filter(function (d) { return d.m === m; }); if (!ds.length) return '';
        var n = ds.filter(function (d) { return done[d.k]; }).length;
        return '<p class="prow m-' + m + '"><span class="pl">' + m + '</span>' + bar(n / ds.length) + '<span class="pval">' + n + '/' + ds.length + '</span></p>';
      }).join('') + '</section>';
      // practice accuracy
      var byK = {}, R = 0, W = 0;
      Object.keys(st).forEach(function (id) { var k = id.split(':')[0], s = st[id]; byK[k] = byK[k] || [0, 0]; byK[k][0] += s[0]; byK[k][1] += s[1]; R += s[0]; W += s[1]; });
      h += '<section class="pcard"><h2>Practice questions</h2><p class="big">' + (R + W ? Math.round(100 * R / (R + W)) + '%' : '–') + ' <small>' + (R + W) + ' answered</small></p>' + mods.map(function (m) {
        var r = 0, w = 0; Object.keys(byK).forEach(function (k) { if (k.split('-')[0] === m) { r += byK[k][0]; w += byK[k][1]; } });
        if (!(r + w)) return '';
        return '<p class="prow m-' + m + '"><span class="pl">' + m + '</span>' + bar(r / (r + w)) + '<span class="pval">' + Math.round(100 * r / (r + w)) + '%</span></p>';
      }).join('') + '</section>';
      // weakest weeks
      var weak = Object.keys(byK).filter(function (k) { return byK[k][0] + byK[k][1] >= 4; }).map(function (k) { return [k, byK[k][0] / (byK[k][0] + byK[k][1])]; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, 5);
      h += '<section class="pcard"><h2>Weakest weeks</h2>' + (weak.length ? '<ul class="my-list">' + weak.map(function (w) {
        var d = docs.filter(function (x) { return x.k === w[0]; })[0] || { u: '#', t: w[0], m: '' };
        return '<li class="m-' + d.m + '"><a href="' + d.u + '"><span class="wk">' + escH(w[0].replace('-', ' ')) + '</span> ' + escH(d.t) + '</a><span class="pval">' + Math.round(100 * w[1]) + '%</span></li>';
      }).join('') + '</ul>' : '<p class="qempty">Answer at least 4 questions from a week to see it here.</p>') + '</section>';
      // confidence
      var CL = { sure: 'Sure', think: 'Think so', guess: 'Guessing' };
      h += '<section class="pcard"><h2>Confidence vs accuracy</h2>' + (Object.keys(conf).length ? Object.keys(CL).map(function (c) {
        var v = conf[c] || [0, 0], n = v[0] + v[1]; if (!n) return '';
        return '<p class="prow"><span class="pl">' + CL[c] + '</span>' + bar(v[0] / n, c === 'sure' ? 'sure' : '') + '<span class="pval">' + Math.round(100 * v[0] / n) + '% of ' + n + '</span></p>';
      }).join('') + ((conf.sure && conf.sure[1]) ? '<p class="pnote">' + conf.sure[1] + ' answer' + (conf.sure[1] > 1 ? 's' : '') + ' you were sure of were wrong: those come back first in Practice.</p>' : '') : '<p class="qempty">Rate how sure you are before answering in Practice questions.</p>') + '</section>';
      // activity: streak + 14 days
      var days = [], d0 = new Date(), streak = 0, counting = true, totS = 0, totQ = 0;
      Object.keys(act).forEach(function (k) { totS += act[k].s || 0; totQ += act[k].q || 0; });
      for (var i = 0; i < 60; i++) {
        var d = new Date(d0); d.setDate(d0.getDate() - i);
        var key = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), a = act[key] || {};
        var any = (a.q || 0) + (a.s || 0) + (a.ex || 0) + (a.osce || 0) > 0;
        if (counting) { if (any) streak++; else if (i > 0) counting = false; }
        if (i < 14) days.unshift({ k: key, q: a.q || 0, m: Math.round((a.s || 0) / 60), dn: d.toLocaleDateString('en-AU', { weekday: 'narrow' }) });
      }
      var mx = Math.max.apply(null, days.map(function (x) { return x.q + x.m; }).concat([1]));
      h += '<section class="pcard wide"><h2>Last 14 days</h2><p class="big">' + streak + ' <small>day streak · ' + Math.round(totS / 3600 * 10) / 10 + ' h reading · ' + totQ + ' questions answered</small></p><div class="days">' + days.map(function (x) {
        return '<span class="day" title="' + x.k + ': ' + x.q + ' questions, ' + x.m + ' min reading"><i class="dq" style="height:' + Math.round(70 * x.q / mx) + 'px"></i><i class="dm" style="height:' + Math.round(70 * x.m / mx) + 'px"></i><b>' + x.dn + '</b></span>';
      }).join('') + '</div><p class="pnote"><i class="dq sw"></i> questions <i class="dm sw"></i> minutes reading</p></section>';
      // other
      var os = lsGet('md3012:osce', {}), osk = Object.keys(os), hlc = 0, hlx = lsGet('md3012:hl', {});
      Object.keys(hlx).forEach(function (k) { hlc += hlx[k].length; });
      var img = lsGet('md3012:img', {}), ir = 0, iw = 0; Object.keys(img).forEach(function (k) { ir += img[k][0]; iw += img[k][1]; });
      h += '<section class="pcard"><h2>Also</h2><p class="prow"><span class="pl">Image rounds</span><span class="pval">' + (ir + iw ? Math.round(100 * ir / (ir + iw)) + '% of ' + (ir + iw) : 'not started') + '</span></p>' +
        '<p class="prow"><span class="pl">OSCE stations</span><span class="pval">' + (osk.length ? osk.map(function (k) { var l = os[k][os[k].length - 1]; return escH(k.replace(/ station/i, '')) + ' ' + l.score + '/' + l.total; }).join(', ') : 'not started') + '</span></p>' +
        '<p class="prow"><span class="pl">Highlights</span><span class="pval"><a href="mynotes.html">' + hlc + ' · ' + Object.keys(lsGet('md3012:bm', {})).length + ' bookmarks</a></span></p></section>';
      h += '</div>';
      pOut.innerHTML = h;
      pOut.appendChild(resetCard());
    });
  }

  // ---- practice questions: multiple choice / fill in the blank / short answer
  var proot = document.getElementById('practice');
  if (proot) {
    var Q = [], stats = lsGet('md3012:practice', {}), scope = 'revised', fmtPick = 'mix', mods = {}, recent = [];
    var session = { n: 0, ok: 0 }, cur = null, curFmt = null, answered = false;
    var $ = function (s) { return proot.querySelector(s); };
    var card = $('.qcard'), empty = $('.qempty'), sline = $('.qstats');
    var meta = $('.qmeta'), qfmt = $('.qfmt'), qt = $('.qtext'), opts = $('.opts'), blank = $('.blank'), binput = $('.binput');
    var sinput = $('.sinput'), fb = $('.fb');
    var B = function (a) { return $('[data-act=' + a + ']'); };
    var revisedCount = Object.keys(done).length;
    var curConf = null, confRow = ui('div', 'conf', '<span>How sure are you?</span><button type="button" data-c="sure">Sure</button><button type="button" data-c="think">Think so</button><button type="button" data-c="guess">Guessing</button>');
    card.insertBefore(confRow, card.querySelector('.acts'));
    confRow.addEventListener('click', function (e) {
      var c = e.target.dataset && e.target.dataset.c; if (!c || answered) return;
      curConf = curConf === c ? null : c;
      confRow.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === curConf)); });
    });
    var FMT = { mcq: 'Multiple choice', blank: 'Fill in the blank', short: 'Short answer' };
    var canDo = function (q, f) { return f === 'short' || (f === 'mcq' && q.mcq) || (f === 'blank' && q.blank); };
    var pool = function () {
      var anyMod = Object.keys(mods).some(function (m) { return mods[m]; });
      return Q.filter(function (q) {
        if (anyMod && !mods[q.m]) return false;
        if (scope === 'revised' && !done[q.k]) return false;
        return fmtPick === 'mix' || canDo(q, fmtPick);
      });
    };
    var weight = function (q) {
      var s = stats[q.id]; if (!s) return 2;
      var w = s[3] === 0 ? 5 : 1 / (1 + s[0]);                   // wrong last time -> comes back sooner
      if (s[3] === 0 && s[4] === 'sure') w *= 2;                 // confidently wrong -> even sooner
      w *= Math.min(3, 1 + (Date.now() - (s[2] || 0)) / 864e5);  // older ones drift back in
      return w + s[1] * 0.3;
    };
    var norm = function (t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+]/g, ''); };
    var lev = function (a, b) {
      var d = [], i, j; for (i = 0; i <= a.length; i++) d[i] = [i];
      for (j = 1; j <= b.length; j++) d[0][j] = j;
      for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      return d[a.length][b.length];
    };
    var show = function (el, on) { el.hidden = !on; };
    var record = function (ok) {
      var s = stats[cur.id] || [0, 0, 0, 1];
      if (ok) s[0]++; else s[1]++;
      s[2] = Date.now(); s[3] = ok ? 1 : 0; s[4] = curConf; stats[cur.id] = s; lsSet('md3012:practice', stats);
      session.n++; if (ok) session.ok++;
      logAct('q', 1);
      if (curConf) {
        var cf = lsGet('md3012:conf', {}); cf[curConf] = cf[curConf] || [0, 0]; cf[curConf][ok ? 0 : 1]++; lsSet('md3012:conf', cf);
        if (curConf === 'sure' && !ok) { var cw = document.createElement('p'); cw.className = 'cwrong'; cw.textContent = 'Confidently wrong: this one will come back soon. Worth re-reading the section.'; fb.appendChild(cw); }
      }
      confRow.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      answered = true; show(B('check'), false); show(B('got'), false); show(B('miss'), false); show(B('next'), true);
      B('next').focus({ preventScroll: true });
      statLine();
    };
    var statLine = function () {
      sline.textContent = pool().length + ' questions in this set · this session: ' + session.n + ' answered, ' + session.ok + ' correct';
    };
    var modelAnswer = function (extra) {
      return '<div class="model"><span class="ml">Answer</span> ' + cur.a + '</div>' + (extra || '') +
        '<a class="from" href="' + base + cur.u + '">Read this in the notes</a>';
    };
    var next = function () {
      var all = pool(), p = all.filter(function (q) { return recent.indexOf(q.id) < 0; });
      if (!p.length) p = all;
      if (!p.length) { show(card, false); show(empty, true); show(sline, false); return; }
      show(card, true); show(empty, false); show(sline, true);
      var tot = 0, ws = p.map(function (q) { var w = weight(q); tot += w; return w; }), r = Math.random() * tot, i = 0;
      for (; i < p.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
      cur = p[i]; recent.push(cur.id); if (recent.length > 12) recent.shift();
      if (fmtPick !== 'mix') curFmt = fmtPick;
      else { var f = ['short']; if (cur.mcq) f.push('mcq', 'mcq'); if (cur.blank) f.push('blank', 'blank'); curFmt = f[Math.floor(Math.random() * f.length)]; }
      answered = false; curConf = null;
      confRow.querySelectorAll('button').forEach(function (b) { b.disabled = false; b.setAttribute('aria-pressed', 'false'); });
      card.className = 'qcard m-' + cur.m + ' f-' + curFmt;
      qfmt.textContent = FMT[curFmt];
      meta.textContent = label(cur) + ': ' + cur.wt; meta.href = base + cur.u;
      qt.innerHTML = cur.q;
      show(opts, curFmt === 'mcq'); show(blank, curFmt === 'blank'); show(sinput, curFmt === 'short');
      show(fb, false); fb.innerHTML = ''; fb.className = 'fb';
      show(B('check'), curFmt !== 'mcq'); B('check').textContent = curFmt === 'short' ? 'Show the answer' : 'Check';
      show(B('got'), false); show(B('miss'), false); show(B('next'), false);
      if (curFmt === 'mcq') {
        opts.innerHTML = cur.mcq.o.map(function (o, k) {
          return '<li><button type="button" class="opt" data-k="' + k + '"><span class="ol">' + 'ABCDE'[k] + '</span><span class="ot">' + o + '</span></button></li>';
        }).join('');
      } else if (curFmt === 'blank') {
        $('.bpre').textContent = cur.blank.pre; $('.bpost').textContent = cur.blank.post;
        binput.value = ''; binput.className = 'binput'; binput.disabled = false;
        binput.style.width = Math.max(6, cur.blank.ans.length + 2) + 'ch';
        binput.focus({ preventScroll: true });
      } else { sinput.value = ''; sinput.disabled = false; }
      statLine();
    };
    opts.addEventListener('click', function (e) {
      var b = e.target.closest('.opt'); if (!b || answered) return;
      var k = +b.dataset.k, ok = k === cur.mcq.c;
      opts.querySelectorAll('.opt').forEach(function (x) {
        x.disabled = true;
        if (+x.dataset.k === cur.mcq.c) x.classList.add('right'); else if (x === b) x.classList.add('wrong');
      });
      fb.className = 'fb ' + (ok ? 'yes' : 'no');
      fb.innerHTML = '<p class="verdict">' + (ok ? 'Correct.' : 'Not quite: the answer is ' + 'ABCDE'[cur.mcq.c] + '.') + '</p>' +
        '<a class="from" href="' + base + cur.u + '">Read this in the notes</a>';
      show(fb, true); record(ok);
    });
    var checkBlank = function () {
      var g = norm(binput.value), t = norm(cur.blank.ans);
      if (!g) { binput.focus(); return; }
      var tol = t.length >= 9 ? 2 : t.length >= 5 ? 1 : 0, ok = g === t || lev(g, t) <= tol;
      binput.disabled = true; binput.classList.add(ok ? 'right' : 'wrong');
      fb.className = 'fb ' + (ok ? 'yes' : 'no');
      fb.innerHTML = '<p class="verdict">' + (ok ? (g === t ? 'Correct.' : 'Correct (close enough: “' + escH(cur.blank.ans) + '”).') :
        'Not quite: the missing word is “' + escH(cur.blank.ans) + '”.') + '</p>' + modelAnswer();
      show(fb, true); record(ok);
    };
    var checkShort = function () {
      var txt = norm(sinput.value).length ? sinput.value.toLowerCase() : '';
      var hit = 0, keys = (cur.keys || []).map(function (k) {
        var stem = norm(k).slice(0, Math.max(4, Math.min(6, norm(k).length - 1)));
        var got = txt && stem && norm(txt).indexOf(stem) > -1; if (got) hit++;
        return '<span class="key' + (got ? ' on' : '') + '">' + escH(k) + '</span>';
      });
      sinput.disabled = true;
      var kp = keys.length ? '<p class="keys">' + (txt ? 'Key words you used: ' + hit + ' of ' + keys.length : 'Key words') + ' ' + keys.join(' ') + '</p>' : '';
      fb.className = 'fb'; fb.innerHTML = modelAnswer(kp) + '<p class="ask">Did you get it?</p>';
      show(fb, true); show(B('check'), false); show(B('got'), true); show(B('miss'), true);
      B('got').focus({ preventScroll: true });
    };
    B('check').addEventListener('click', function () { if (curFmt === 'blank') checkBlank(); else checkShort(); });
    binput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!answered) checkBlank(); else next(); } });
    sinput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); checkShort(); } });
    B('got').addEventListener('click', function () { record(true); });
    B('miss').addEventListener('click', function () { record(false); });
    B('next').addEventListener('click', next);
    B('skip').addEventListener('click', next);
    document.addEventListener('keydown', function (e) {
      if (/INPUT|TEXTAREA/.test(e.target.tagName) || !cur) return;
      if (curFmt === 'mcq' && !answered) {
        var k = 'abcde'.indexOf(e.key.toLowerCase()); if (k < 0) k = '12345'.indexOf(e.key);
        if (k > -1) { var o = opts.querySelector('[data-k="' + k + '"]'); if (o) o.click(); }
      } else if (e.key === 'Enter' && answered) next();
    });
    var setScope = function (s) { scope = s; proot.querySelectorAll('[data-scope]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.scope === s)); }); };
    proot.querySelectorAll('[data-scope]').forEach(function (b) {
      if (b.dataset.scope === 'revised') b.textContent = "Weeks I've revised (" + revisedCount + ')';
      b.addEventListener('click', function () { setScope(b.dataset.scope); recent = []; next(); });
    });
    proot.querySelectorAll('[data-fmt]').forEach(function (b) {
      b.addEventListener('click', function () {
        fmtPick = b.dataset.fmt;
        proot.querySelectorAll('[data-fmt]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        recent = []; next();
      });
    });
    proot.querySelectorAll('[data-mod]').forEach(function (b) {
      b.addEventListener('click', function () { mods[b.dataset.mod] = !mods[b.dataset.mod]; b.setAttribute('aria-pressed', String(!!mods[b.dataset.mod])); recent = []; next(); });
    });
    proot.querySelector('.qempty [data-act=all]').addEventListener('click', function () { setScope('all'); recent = []; next(); });
    setScope(revisedCount ? 'revised' : 'all');
    loadData('practice').then(function (d) { Q = d; next(); });
  }

  // ---- topics page: filter
  var tf = document.querySelector('.tfilter');
  if (tf) tf.addEventListener('input', function () {
    var q = tf.value.trim().toLowerCase();
    document.querySelectorAll('.topic, .mn-card').forEach(function (t) { t.hidden = !!q && t.dataset.k.indexOf(q) < 0; });
  });


  // =====================================================================================
  // Signed-in user (published site) + admin "flag an edit" tool
  // =====================================================================================
  var USER = window.MD3012_USER || (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? { name: 'admin', role: 'admin', local: true } : null);
  var menu = document.querySelector('.more .menu');
  if (USER && menu && !USER.local) {
    var who = document.createElement('div'); who.className = 'who';
    who.innerHTML = 'Signed in as <b>' + escH(USER.name) + '</b>' + (USER.role === 'admin' ? ' <span class="who-admin">admin</span>' : '') + '<button type="button" class="skip">Log out</button>';
    who.querySelector('button').addEventListener('click', function () { if (window.MD3012_LOGOUT) window.MD3012_LOGOUT(); });
    menu.appendChild(who);
  }
  if (USER && USER.role === 'admin') (function () {
    var FK = 'md3012:flags';
    var flags = lsGet(FK, []);
    var saveF = function () { lsSet(FK, flags); paintCount(); };
    var segs = location.pathname.split('/'), lastSeg = segs.pop() || 'index.html', dirSeg = segs.pop() || '';
    var here = body.dataset.url || (/^(tin|em|sss|gh|cs)$/.test(dirSeg) ? dirSeg + '/' + lastSeg : lastSeg);
    var fab = ui('div', 'flag-fab', '<button type="button" class="flag-go">✎ Flag an edit</button><button type="button" class="flag-list" aria-label="Your flagged edits"><span class="flag-n">0</span></button>');
    document.body.appendChild(fab);
    var nEl = fab.querySelector('.flag-n');
    var paintCount = function () { var n = flags.filter(function (f) { return !f.sent; }).length; nEl.textContent = n; fab.classList.toggle('has', n > 0); };
    paintCount();
    var bar = ui('div', 'flag-bar', 'Tap the part of the page you want changed. <button type="button" class="skip">Cancel</button>'); bar.hidden = true; document.body.appendChild(bar);
    var picking = false, hov = null;
    var stop = function () { picking = false; bar.hidden = true; body.classList.remove('flagging'); if (hov) hov.classList.remove('flag-hov'); hov = null; };
    var describe = function (el) {
      var t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      var sec = el.closest('section.sec'), h = sec && sec.querySelector('h1');
      var KIND = { H1: 'heading', H2: 'sub-heading', LI: 'bullet point', P: 'paragraph', TD: 'table cell', TH: 'table header', TR: 'table row', TABLE: 'table', A: 'link', BUTTON: 'button', SPAN: 'text', B: 'bold text', STRONG: 'bold text', IMG: 'image', INPUT: 'box', MAIN: 'page area', SECTION: 'section' };
      var kind = el.tagName === 'IMG' ? 'image' : el.closest('figure') ? 'figure' : el.closest('header.bar') ? 'top bar' : el.closest('.cell') ? 'board square' : (KIND[el.tagName] || 'part of the page');
      return { kind: kind, text: t.slice(0, 140) || (el.getAttribute('alt') || el.getAttribute('src') || '').slice(0, 140), sec: h ? h.textContent.replace(/[☆★]/g, '').trim() : '' };
    };
    var pinAll = function () {
      document.querySelectorAll('.flag-pin').forEach(function (p) { p.remove(); });
      flags.forEach(function (f, i) {
        if (f.page !== here || f.sent) return;
        var el = null; try { el = f.path ? document.querySelector(f.path) : null; } catch (e) {}
        if (!el) return;
        var pin = ui('span', 'flag-pin', String(i + 1)); pin.title = f.note;
        el.insertAdjacentElement(el.tagName === 'IMG' || /^(LI|TD|TR|P|H1|H2)$/.test(el.tagName) ? 'afterbegin' : 'beforebegin', pin);
      });
    };
    var cssPath = function (el) {
      var parts = [];
      for (; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
        if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
        var i = 1, s = el; while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
        parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      }
      return parts.join(' > ');
    };
    var ask = function (el) {
      var d = describe(el), pop = ui('div', 'flag-pop');
      pop.innerHTML = '<p class="fp-what"><b>' + escH(d.kind) + '</b>' + (d.sec ? ' in ' + escH(d.sec) : '') + (d.text ? ': “' + escH(d.text.slice(0, 90)) + (d.text.length > 90 ? '…' : '') + '”' : '') + '</p>' +
        '<textarea rows="3" placeholder="What should change? e.g. make this bigger, fix this fact, move this up"></textarea>' +
        '<div class="acts"><button type="button" class="btn solid" data-a="save">Save flag</button><button type="button" class="skip" data-a="x">Cancel</button></div>';
      document.body.appendChild(pop);
      var r = el.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 24);
      pop.style.width = w + 'px';
      pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + window.scrollX)) + 'px';
      pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
      var ta = pop.querySelector('textarea'); ta.focus();
      pop.addEventListener('click', function (e) {
        var a = e.target.dataset && e.target.dataset.a; if (!a) return;
        if (a === 'save' && ta.value.trim()) {
          flags.push({ id: 'f' + Date.now().toString(36), page: here, title: document.title, path: cssPath(el), what: d, note: ta.value.trim(), at: Date.now(), by: USER.name });
          saveF(); pinAll();
        }
        pop.remove();
      });
    };
    fab.querySelector('.flag-go').addEventListener('click', function () { picking = true; bar.hidden = false; body.classList.add('flagging'); });
    bar.querySelector('button').addEventListener('click', stop);
    document.addEventListener('mouseover', function (e) {
      if (!picking || e.target.closest('[data-ui]')) return;
      if (hov) hov.classList.remove('flag-hov'); hov = e.target; hov.classList.add('flag-hov');
    });
    document.addEventListener('click', function (e) {
      if (!picking || e.target.closest('[data-ui]')) return;
      e.preventDefault(); e.stopPropagation();
      var el = e.target; stop(); ask(el);
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && picking) stop(); });
    // list panel
    var repo = (window.MD3012_AUTH || {}).repo || '';
    var asText = function (list) {
      return list.map(function (f, i) {
        return (i + 1) + '. [' + f.page + '] ' + f.note + '\n   on: ' + f.what.kind + (f.what.sec ? ' in “' + f.what.sec + '”' : '') + (f.what.text ? ': “' + f.what.text.slice(0, 100) + '”' : '') + '\n   (' + new Date(f.at).toLocaleString('en-AU') + ', ' + f.by + ', selector: ' + f.path + ')';
      }).join('\n');
    };
    var sessionSent = function () { return flags.some(function (f) { return f.sent && Date.now() - f.sent < 10 * 60000; }); };
    var panel = function () {
      var old = document.querySelector('.flag-panel'); if (old) { old.remove(); return; }
      var open = flags.filter(function (f) { return !f.sent; }), done = flags.filter(function (f) { return f.sent; });
      var p = ui('div', 'flag-panel');
      p.innerHTML = '<header><strong>Flagged edits</strong><button type="button" class="dg-x" aria-label="Close">×</button></header>' +
        (open.length ? '<ol>' + open.map(function (f) {
          return '<li><a href="' + base + f.page + '">' + escH(f.page) + '</a><p>' + escH(f.note) + '</p><span class="wt2">' + escH(f.what.kind + (f.what.sec ? ' in ' + f.what.sec : '')) + '</span><button type="button" class="skip" data-del="' + f.id + '">Delete</button></li>';
        }).join('') + '</ol>' : '<p class="qempty">No new flags. Tap “✎ Flag an edit”, then tap anything on any page.</p>') +
        '<div class="acts">' + (open.length ? (repo ? '<button type="button" class="btn solid" data-a="send">' + (done.length && open.length < flags.length && sessionSent() ? 'Send next part' : 'Send ' + open.length + ' to Claude') + '</button>' : '') + '<button type="button" class="btn" data-a="copy">Copy as text</button>' : '') +
        (done.length ? '<button type="button" class="skip" data-a="resend">Send ' + done.length + ' sent again</button><button type="button" class="skip" data-a="clear">Clear ' + done.length + ' sent</button>' : '') + '</div>' +
        (open.length ? '<p class="wt2">' + (repo ? '“Send” opens a GitHub issue with these flags filled in; press <b>Submit new issue</b> there (sign in to GitHub first). Then tell Claude in the “website design ideas” chat to check your flags.' : 'Copy the list and paste it into the “website design ideas” chat.') + '</p>' : '');
      document.body.appendChild(p);
      p.addEventListener('click', function (e) {
        var t = e.target;
        if (t.closest('.dg-x')) { p.remove(); return; }
        if (t.dataset.del) { flags = flags.filter(function (f) { return f.id !== t.dataset.del; }); saveF(); pinAll(); p.remove(); panel(); return; }
        var a = t.dataset.a; if (!a) return;
        if (a === 'copy') { var txt = 'Website edits I flagged:\n' + asText(open); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { t.textContent = 'Copied'; }, function () { window.prompt('Copy this:', txt); }); }
        if (a === 'send') {
          // a pre-filled GitHub issue link can only hold so much text, so big lists go in parts (one issue per click)
          var head = 'Flagged on the MD3012 notes site by ' + USER.name + '. Claude: list these in the chat, ask before changing anything, then close this issue when done.\n\n';
          var item = function (f, i) { return '- [ ] **' + (i + 1) + '. ' + f.page + '**: ' + f.note + '\n  - on: ' + f.what.kind + (f.what.sec ? ' in “' + f.what.sec + '”' : '') + (f.what.text ? ': “' + f.what.text.slice(0, 120) + '”' : '') + '\n  - selector: `' + f.path + '`'; };
          var chunk = [], size = encodeURIComponent(head).length;
          for (var i = 0; i < open.length; i++) {
            var add = encodeURIComponent(item(open[i], i) + '\n').length;
            if (chunk.length && size + add > 6000) break;
            chunk.push(open[i]); size += add;
          }
          var left = open.length - chunk.length;
          var title = 'Website edits: ' + chunk.length + ' flag' + (chunk.length > 1 ? 's' : '') + (left ? ' (more to follow)' : '') + ' (' + new Date().toLocaleDateString('en-AU') + ')';
          var bodyTxt = head + chunk.map(item).join('\n');
          window.open('https://github.com/' + repo + '/issues/new?labels=site-edit&title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(bodyTxt), '_blank', 'noopener');
          chunk.forEach(function (f) { f.sent = Date.now(); }); saveF(); pinAll(); p.remove();
          if (left) panel();   // reopen with "Send next …" for the rest
        }
        if (a === 'resend') { flags.forEach(function (f) { f.sent = 0; }); saveF(); pinAll(); p.remove(); panel(); }
        if (a === 'clear') { flags = flags.filter(function (f) { return !f.sent; }); saveF(); p.remove(); panel(); }
      });
    };
    fab.querySelector('.flag-list').addEventListener('click', panel);
    pinAll();
  })();

  // ---- search: module filter, abbreviations + plain-English synonyms, image results, jump to the matching line
  var input = document.querySelector('.search input'), box = document.querySelector('.search .results');
  if (!input) return;
  var data = null, gl = {}, loading = null, smod = '';
  var SYN = { 'heart attack': ['myocardial infarction', 'MI', 'STEMI'], 'stroke': ['CVA', 'cerebrovascular'], 'blood clot': ['thrombus', 'thrombosis', 'embol'],
    'clot': ['thrombus', 'thrombosis', 'embol'], 'high blood pressure': ['hypertension'], 'low blood pressure': ['hypotension'], 'sugar': ['glucose'],
    'kidney': ['renal'], 'liver': ['hepatic'], 'lung': ['pulmonary'], 'skin cancer': ['melanoma', 'basal cell', 'squamous cell'], 'cancer': ['carcinoma', 'malignan', 'neoplas'],
    'rash': ['eruption', 'exanthem'], 'fit': ['seizure'], 'fits': ['seizure'], 'baby': ['infant', 'neonat'], 'pregnant': ['pregnancy', 'antenatal'],
    'eye': ['ocular', 'ophthalm'], 'bleed': ['haemorrhage', 'bleeding'], 'bleeding': ['haemorrhage'], 'broken bone': ['fracture'], 'heart failure': ['pulmonary oedema'],
    'painkiller': ['analgesi', 'NSAID', 'opioid'], 'antibiotic': ['penicillin', 'cephalosporin', 'doxycycline'], 'steroid': ['corticosteroid', 'prednisolone'],
    'heart rate': ['tachycardia', 'bradycardia'], 'breathing': ['respiratory', 'dyspnoea'], 'short of breath': ['dyspnoea', 'SOB'], 'itch': ['pruritus'], 'itchy': ['pruritus'] };
  function get() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = Promise.all([loadData('search'), loadData('glossary').catch(function () { return {}; })])
      .then(function (d) { data = d[0]; gl = d[1] || {}; return data; });
    return loading;
  }
  var lower = function (x) { return String(x).toLowerCase(); };
  function groups(q) {
    var ql = q.toLowerCase().replace(/\s+/g, ' ').trim(), whole = (SYN[ql] || []).slice();
    Object.keys(gl).forEach(function (k) { if (lower(gl[k]) === ql) whole.push(k); });
    if (whole.length) return [[ql].concat(whole.map(lower))];
    return ql.split(' ').filter(Boolean).map(function (t) {
      var alts = [t].concat(SYN[t] || []);
      Object.keys(gl).forEach(function (k) { if (lower(k) === t) alts.push(gl[k]); });
      return alts.map(lower);
    });
  }
  var fcache = {};
  function find(txt, alt) { // terms match from the start of a word; short ones (MI, AF) only as whole words
    var rx = fcache[alt] || (fcache[alt] = new RegExp('(^|[^a-z0-9])' + alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (alt.length > 3 ? '' : '(?![a-z0-9])')));
    var m = rx.exec(txt);
    return m ? m.index + m[1].length : -1;
  }
  function run() {
    var q = input.value.trim();
    if (q.length < 2) { box.hidden = true; return; }
    get().then(function (d) {
      var gs = groups(q), out = [], counts = {};
      d.forEach(function (r) {
        var s = lower(r.s), t = lower(r.t), score = 0, jump = null, pos = -1;
        for (var i = 0; i < gs.length; i++) {
          var best = 0, bj = null, bp = -1;
          gs[i].forEach(function (alt) {
            var hs = find(s, alt) > -1, ht = find(t, alt), sc = (hs ? 8 : 0) + (ht > -1 ? 1 + Math.min(5, t.split(alt).length - 1) : 0);
            if (sc > best) { best = sc; bj = alt; bp = ht; }
          });
          if (!best) return;
          score += best; if (!jump) { jump = bj; pos = bp; }
        }
        counts[r.m] = (counts[r.m] || 0) + 1;
        if (smod && r.m !== smod) return;
        out.push([score - (r.img ? 2 : 0), r, jump, pos]);
      });
      out.sort(function (a, b) { return b[0] - a[0]; });
      var mods = ['TIN', 'EM', 'SSS', 'GH', 'CS'].filter(function (m) { return counts[m]; });
      var head = '<div class="rchips" data-ui="1"><button type="button" data-sm=""' + (smod ? '' : ' aria-pressed="true"') + '>All</button>' + mods.map(function (m) {
        return '<button type="button" class="m-' + m + '" data-sm="' + m + '"' + (smod === m ? ' aria-pressed="true"' : '') + '>' + m + ' <small>' + counts[m] + '</small></button>';
      }).join('') + '</div>';
      if (!out.length) { box.innerHTML = head + '<div class="none">No matches for “' + escH(q) + '”' + (smod ? ' in ' + smod : '') + '.</div>'; box.hidden = false; return; }
      var words = [].concat.apply([], gs);
      box.innerHTML = head + out.slice(0, 30).map(function (o) {
        var r = o[1], t = r.t, i = o[3];
        var snip = i > -1 ? (i > 60 ? '…' : '') + t.slice(Math.max(0, i - 60), i + 110) + '…' : t.slice(0, 140) + '…';
        snip = escH(snip);
        words.forEach(function (w) {
          if (w.length < 2) return;
          var e = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          snip = snip.replace(new RegExp(w.length > 3 ? '\\b(' + e + ')' : '\\b(' + e + ')\\b', 'ig'), '<mark>$1</mark>');
        });
        var parts = r.u.split('#'), href = base + parts[0] + (o[2] ? '?hl=' + encodeURIComponent(o[2]) : '') + (parts[1] ? '#' + parts[1] : '');
        return '<a href="' + href + '"' + (r.img ? ' class="rimg"' : '') + '>' + (r.img ? '<img src="' + base + r.img + '" alt="" loading="lazy">' : '') +
          '<div class="where m-' + r.m + '">' + label(r) + ': ' + escH(r.wt) + '</div><div class="sec">' + escH(r.s) + '</div><div class="snip">' + snip + '</div></a>';
      }).join('');
      box.hidden = false;
    });
  }
  box.addEventListener('mousedown', function (e) { if (e.target.closest('[data-sm]')) e.preventDefault(); });
  box.addEventListener('click', function (e) { var b = e.target.closest('[data-sm]'); if (b) { smod = b.dataset.sm; run(); input.focus(); } });
  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 140); });
  input.addEventListener('focus', function () { get(); if (input.value.trim().length > 1) run(); });
  document.addEventListener('click', function (e) { if (e.target.isConnected && !e.target.closest('.search')) box.hidden = true; });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.hidden = true; input.blur(); } });
})();
