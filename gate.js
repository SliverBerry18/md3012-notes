/* MD3012 notes: login + decryption for the published (encrypted) site. 2026-10-12.
   auth.js holds the site key wrapped once per password (PBKDF2-SHA256 -> AES-GCM). The right password unwraps
   the site key; page bodies, data files, images and PDFs are then decrypted in the browser. */
(function () {
  var A = window.MD3012_AUTH || { keys: [] }, doc = document, body = doc.body;
  var depth = (doc.querySelector('script[src$="gate.js"]').getAttribute('src').match(/\.\.\//g) || []).length;
  var base = new Array(depth + 1).join('../');
  var SKEY = 'md3012:auth';
  var te = new TextEncoder(), td = new TextDecoder();
  var unb64 = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var tob64 = function (u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var key = null;
  // sign-in log (Google Sheet): every sign-in, plus the first visit each day for people who stay signed in
  var logVisit = function (who, type) {
    if (!A.log) return;
    var ua = navigator.userAgent;
    var dev = /iPhone/.test(ua) ? 'iPhone' : /iPad|Macintosh.*Mobile/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other';
    try { fetch(A.log, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name: who.name, role: who.role, type: type, device: dev, page: location.pathname.replace(/^.*md3012-notes\//, '') || 'index.html' }) }); } catch (e) {}
  };
  var dailyVisit = function (who) {
    var today = new Date().toDateString();
    try { if (localStorage.getItem('md3012:seen') === today) return; localStorage.setItem('md3012:seen', today); } catch (e) { return; }
    logVisit(who, 'return visit');
  };
  var ADMIN_ONLY = ['practice', 'images'];   // page <main> ids only the admin can use; empty this list to open them to everyone

  var getSaved = function () { try { return JSON.parse(localStorage.getItem(SKEY) || sessionStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } };
  var save = function (o, remember) { try { (remember ? localStorage : sessionStorage).setItem(SKEY, JSON.stringify(o)); } catch (e) {} };
  window.MD3012_LOGOUT = function () { try { localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY); } catch (e) {} location.reload(); };

  var decrypt = function (buf) {
    var u = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12));
  };
  var unwrap = async function (pw) {
    var base_ = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']);
    for (var i = 0; i < A.keys.length; i++) {
      var k = A.keys[i];
      try {
        var kek = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(k.salt), iterations: A.iter, hash: 'SHA-256' }, base_, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        var raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(k.iv) }, kek, unb64(k.ct));
        var t = '';
        if (k.at) { try { t = td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(k.iv2) }, kek, unb64(k.at))); } catch (e2) {} }
        return { raw: new Uint8Array(raw), role: k.role, t: t };
      } catch (e) { /* not this password */ }
    }
    return null;
  };

  // ---- encrypted assets: images, PDFs and data files (shared with app.js)
  var MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', pdf: 'application/pdf' };
  var cache = {};
  var getBlobUrl = function (url) {
    var clean = url.split('#')[0].split('?')[0];
    if (!cache[clean]) cache[clean] = fetch(clean + '.enc').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(decrypt).then(function (b) { return URL.createObjectURL(new Blob([b], { type: MIME[(clean.split('.').pop() || '').toLowerCase()] || 'application/octet-stream' })); });
    return cache[clean];
  };
  window.MD3012_IMG = getBlobUrl;
  window.MD3012_DATA = function (name) {
    return fetch(base + 'data/' + name + '.enc').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(decrypt).then(function (b) { return JSON.parse(td.decode(b)); });
  };
  var isAsset = function (src) { return src && !/^(blob:|data:|https?:)/.test(src) && /(^|\/)assets\//.test(src); };
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } });
  }, { rootMargin: '600px 0px' }) : null;
  var load = function (img) {
    var s = img.getAttribute('data-encsrc'); if (!s) return;
    img.removeAttribute('data-encsrc');
    getBlobUrl(s).then(function (u) { img.src = u; }).catch(function () { img.alt = 'Image could not be loaded'; });
  };
  var claim = function (img) {
    var s = img.getAttribute('src');
    if (!isAsset(s)) return;
    img.setAttribute('data-encsrc', s); img.removeAttribute('src');
    if (io && img.getAttribute('loading') === 'lazy') io.observe(img); else load(img);
  };
  // images added later by the page scripts (image rounds, search thumbnails)
  var mo = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'attributes' && m.target.tagName === 'IMG') claim(m.target);
      m.addedNodes && m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') claim(n); else n.querySelectorAll && n.querySelectorAll('img').forEach(claim);
      });
    });
  });
  // PDF downloads
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href');
    if (!/\.pdf$/i.test(h) || /^https?:/.test(h)) return;
    e.preventDefault();
    var label = a.textContent; a.textContent = 'Preparing PDF…';
    getBlobUrl(h).then(function (u) {
      a.textContent = label;
      var d = doc.createElement('a'); d.href = u; d.download = h.split('/').pop();
      if (a.target === '_blank' && !a.hasAttribute('download')) { window.open(u, '_blank'); return; }
      doc.body.appendChild(d); d.click(); d.remove();
    }).catch(function () { a.textContent = label; alert('Sorry, that PDF could not be opened.'); });
  });

  // ---- open the page
  var open = async function (who) {
    var enc = doc.getElementById('md-enc');
    var raw = await decrypt(unb64(JSON.parse(enc.textContent)));
    var page = JSON.parse(td.decode(raw));
    window.MD3012_USER = { name: who.name, role: who.role, t: who.t || '' };
    var t = doc.createElement('template'); t.innerHTML = page.b;
    // admin-only pages (temporary): members see a "coming soon" note and no links to them
    if (who.role !== 'admin') {
      body.classList.add('member');
      ADMIN_ONLY.forEach(function (id) {
        var m = t.content.getElementById(id); if (!m) return;
        m.id = id + '-off';
        m.innerHTML = '<h1>Coming soon</h1><p class="lead">This section is still being finished and will open shortly. Everything else in the notes is ready to use.</p><p><a class="btn solid" href="' + base + 'index.html">Back to the notes</a></p>';
      });
    }
    t.content.querySelectorAll('img').forEach(function (img) {
      var s = img.getAttribute('src'); if (isAsset(s)) { img.setAttribute('data-encsrc', s); img.removeAttribute('src'); }
    });
    var scripts = Array.prototype.slice.call(t.content.querySelectorAll('script'));
    scripts.forEach(function (s) { s.remove(); });
    doc.getElementById('md-gate').remove(); enc.remove();
    body.appendChild(t.content);
    body.classList.remove('locked');
    doc.title = page.t.replace(/&amp;/g, '&');
    body.querySelectorAll('img[data-encsrc]').forEach(function (img) { if (io && img.getAttribute('loading') === 'lazy') io.observe(img); else load(img); });
    mo.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    if (location.hash) { var target = doc.getElementById(decodeURIComponent(location.hash.slice(1))); if (target) setTimeout(function () { target.scrollIntoView(); }, 50); }
    for (var i = 0; i < scripts.length; i++) {
      await new Promise(function (res) {
        var n = doc.createElement('script');
        if (scripts[i].src) { n.src = scripts[i].getAttribute('src'); n.onload = n.onerror = res; } else { n.textContent = scripts[i].textContent; res(); }
        doc.body.appendChild(n);
      });
    }
  };

  var showLogin = function (msg) {
    var g = doc.getElementById('md-gate');
    g.innerHTML = '<form class="md-login" autocomplete="on"><p class="md-brand">MD3012 notes</p>' +
      '<p class="md-sub">Year 3 MBBS revision notes. Sign in to open them.</p>' +
      '<label>Name<input name="username" autocomplete="username" required></label>' +
      '<label>Password<span class="md-pw"><input name="password" type="password" autocomplete="current-password" required>' +
      '<button type="button" class="md-eye" aria-label="Show password" aria-pressed="false">Show</button></span></label>' +
      '<label class="md-rem"><input type="checkbox" name="remember" checked> Stay signed in on this device</label>' +
      '<button type="submit">Open notes</button><p class="md-err" role="alert">' + (msg ? esc(msg) : '') + '</p>' +
      '<p class="md-fine">Sign-ins are recorded.</p></form>';
    var f = g.querySelector('form');
    f.username.focus();
    var eye = f.querySelector('.md-eye');
    eye.addEventListener('click', function () {
      var show = f.password.type === 'password';
      f.password.type = show ? 'text' : 'password';
      eye.textContent = show ? 'Hide' : 'Show';
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      eye.setAttribute('aria-pressed', String(show));
      f.password.focus();
    });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = f.username.value.trim(), pw = f.password.value;
      if (!name) { f.querySelector('.md-err').textContent = 'Please enter your name.'; return; }
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Checking…';
      var r = await unwrap(pw);
      if (!r) { btn.disabled = false; btn.textContent = 'Open notes'; f.querySelector('.md-err').textContent = 'That password isn’t right. Check it and try again.'; f.password.select(); return; }
      f.password.type = 'password'; key = await crypto.subtle.importKey('raw', r.raw, 'AES-GCM', false, ['decrypt']);
      var who = { name: name, role: r.role, k: tob64(r.raw), kid: A.kid, t: r.t || '' };
      save(who, f.remember.checked);
      logVisit(who, 'sign-in'); try { localStorage.setItem('md3012:seen', new Date().toDateString()); } catch (e2) {}
      try { await open(who); } catch (err) { showLogin('Something went wrong opening this page. Please reload.'); }
    });
  };

  (async function () {
    if (!window.crypto || !crypto.subtle) {
      doc.getElementById('md-gate').innerHTML = '<p class="md-err">This browser can’t open the notes securely. Please use an up-to-date Chrome, Safari, Edge or Firefox.</p>';
      return;
    }
    var s = getSaved();
    if (s && s.k && s.kid === A.kid) {
      try { key = await crypto.subtle.importKey('raw', unb64(s.k), 'AES-GCM', false, ['decrypt']); await open(s); dailyVisit(s); return; } catch (e) { /* fall through to login */ }
    }
    showLogin(s && s.kid !== A.kid ? 'The site’s password has changed. Please sign in again.' : '');
  })();
})();
