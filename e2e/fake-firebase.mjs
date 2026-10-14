// Firebase TIRUAN untuk uji E2E — sandbox/CI tidak boleh menyentuh Firebase asli.
//  • Skrip SDK gstatic (app/auth/database compat) diganti stub kecil.
//  • "Realtime Database" = Map di proses tes, diakses stub lewat fetch ke /__fakedb/* (di-route Playwright),
//    jadi BEBERAPA konteks browser (= beberapa perangkat) berbagi satu cloud.
// Yang diuji: adapter js/shared/cloud-sync.js (pemuatan, auth, transaksi, status, UI). Yang TIDAK teruji di sini:
// aturan keamanan Firebase sungguhan (dicek scripts/check-firebase-rules.mjs + Rules Playground) dan jaringan asli.
export const STUB_JS = `(function () {
  if (window.firebase && window.firebase.__fake) return;
  function user() { try { return JSON.parse(localStorage.getItem('__fake_fb_user') || 'null'); } catch (e) { return null; } }
  function mk(u) { return u ? { uid: u.uid, email: u.email || '', displayName: u.displayName || null, isAnonymous: !!u.isAnonymous } : null; }
  var listeners = [];
  var authObj = {
    get currentUser() { return mk(user()); },
    onAuthStateChanged: function (cb) { listeners.push(cb); setTimeout(function () { cb(mk(user())); }, 0); return function () { var i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }; },
    signOut: function () { localStorage.removeItem('__fake_fb_user'); listeners.slice().forEach(function (cb) { cb(null); }); return Promise.resolve(); },
    isSignInWithEmailLink: function () { return false; },
    sendSignInLinkToEmail: function () { return Promise.resolve(); },
    signInWithEmailLink: function () { return Promise.reject(new Error('fake')); },
    signInAnonymously: function () { return Promise.resolve(); }
  };
  function call(op, body) { return fetch('/__fakedb/' + op, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function err(code) { var e = new Error(code); e.code = code; return e; }
  function ref(path) {
    return {
      once: function () { return call('get', { path: path }).then(function (r) { if (r.error) throw err(r.error); return { val: function () { return r.value; }, exists: function () { return r.value !== null; } }; }); },
      set: function (v) { return call('set', { path: path, value: v }).then(function (r) { if (r.error) throw err(r.error); }); },
      transaction: function (fn) {
        return (function attempt(n) {
          return call('get', { path: path }).then(function (r) {
            if (r.error) throw err(r.error);
            var cur = r.value, out = fn(cur);
            if (out === undefined) return { committed: false, snapshot: { val: function () { return cur; } } };
            return call('cas', { path: path, expected: cur, value: out }).then(function (c) {
              if (c.error) throw err(c.error);
              if (c.ok) return { committed: true, snapshot: { val: function () { return out; } } };
              return n >= 5 ? { committed: false } : attempt(n + 1);
            });
          });
        })(0);
      }
    };
  }
  var fb = function () {}; fb.__fake = true; fb.apps = [];
  fb.initializeApp = function () { fb.apps.push({}); return {}; };
  fb.app = function () { return {}; };
  fb.auth = function () { return authObj; };
  fb.database = function () { return { ref: ref }; };
  window.firebase = fb;
})();`;

export function makeFakeDb() {
  const data = new Map();
  const db = { mode: 'ok', log: [], data,
    reset() { data.clear(); db.mode = 'ok'; db.log.length = 0; },
    get(path) { return data.has(path) ? JSON.parse(data.get(path)) : null; },
    paths() { return [...data.keys()]; } };
  return db;
}

export async function installFake(context, db) {
  await context.route(/gstatic\.com\/firebasejs\/9\.6\.1\/.*\.js/, (route) => route.fulfill({ contentType: 'text/javascript', body: STUB_JS }));
  await context.route('**/__fakedb/**', async (route) => {
    const op = new URL(route.request().url()).pathname.split('/').pop();
    const body = JSON.parse(route.request().postData() || '{}');
    db.log.push(op + ' ' + body.path);
    if (db.mode === 'offline') return route.abort('failed');
    if (db.mode === 'deny') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ error: 'PERMISSION_DENIED' }) });
    const json = (o) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (op === 'get') return json({ value: db.get(body.path) });
    if (op === 'set') { body.value === null ? db.data.delete(body.path) : db.data.set(body.path, JSON.stringify(body.value)); return json({ ok: true }); }
    if (op === 'cas') {
      const cur = JSON.stringify(db.get(body.path) ?? null), exp = JSON.stringify(body.expected ?? null);
      if (cur !== exp) return json({ ok: false });
      db.data.set(body.path, JSON.stringify(body.value)); return json({ ok: true });
    }
    return json({ error: 'op?' });
  });
}
