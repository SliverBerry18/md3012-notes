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
        return { raw: new Uint8Array(raw), role: k.role };
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
    window.MD3012_USER = { name: who.name, role: who.role };
    var t = doc.createElement('template'); t.innerHTML = page.b;
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
      '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<label class="md-rem"><input type="checkbox" name="remember" checked> Stay signed in on this device</label>' +
      '<button type="submit">Open notes</button><p class="md-err" role="alert">' + (msg ? esc(msg) : '') + '</p></form>';
    var f = g.querySelector('form');
    f.username.focus();
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = f.username.value.trim(), pw = f.password.value;
      if (!name) { f.querySelector('.md-err').textContent = 'Please enter your name.'; return; }
      var btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Checking…';
      var r = await unwrap(pw);
      if (!r) { btn.disabled = false; btn.textContent = 'Open notes'; f.querySelector('.md-err').textContent = 'That password isn’t right. Check it and try again.'; f.password.select(); return; }
      key = await crypto.subtle.importKey('raw', r.raw, 'AES-GCM', false, ['decrypt']);
      var who = { name: name, role: r.role, k: tob64(r.raw), kid: A.kid };
      save(who, f.remember.checked);
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
      try { key = await crypto.subtle.importKey('raw', unb64(s.k), 'AES-GCM', false, ['decrypt']); await open(s); return; } catch (e) { /* fall through to login */ }
    }
    showLogin(s && s.kid !== A.kid ? 'The site’s password has changed. Please sign in again.' : '');
  })();
})();
