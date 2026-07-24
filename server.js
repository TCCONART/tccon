// TCCON — Sistema de Orçamentos · servidor para VPS (Ubuntu 24.04)
// Node.js puro (sem dependências). Serve o app e guarda os dados compartilhados.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ keys: {} }, null, 2));
if (!fs.existsSync(AUTH_FILE)) fs.writeFileSync(AUTH_FILE, JSON.stringify({}, null, 2));

function readAuth() { try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); } catch (e) { return {}; } }
function writeAuth(a) { try { fs.writeFileSync(AUTH_FILE, JSON.stringify(a)); } catch (e) { console.error('auth save', e); } }
function hashPass(senha, salt) { return crypto.scryptSync(String(senha), salt, 64).toString('hex'); }
function setPassword(userId, senha) {
  const auth = readAuth();
  const salt = crypto.randomBytes(16).toString('hex');
  auth[userId] = { salt, hash: hashPass(senha, salt) };
  writeAuth(auth);
}
function verifyPassword(userId, senha) {
  const rec = readAuth()[userId];
  if (!rec) return false;
  const h = hashPass(senha, rec.salt);
  try { return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(rec.hash, 'hex')); } catch (e) { return false; }
}
function clearPassword(userId) { const a = readAuth(); delete a[userId]; writeAuth(a); }

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20 * 1024 * 1024) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve(null); } });
  });
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
  catch (e) { return { keys: {} }; }
}
let saveTimer = null;
function writeStore(store) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(STORE_FILE, JSON.stringify(store)); } catch (e) { console.error('save error', e); }
  }, 150);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback → index.html
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // ===== API =====
  if (url === '/api/store' && req.method === 'GET') {
    return sendJson(res, 200, readStore());
  }
  if (url.startsWith('/api/store/') && req.method === 'PUT') {
    const key = decodeURIComponent(url.slice('/api/store/'.length));
    if (!key || key.indexOf('tccon_') !== 0) return sendJson(res, 400, { error: 'invalid key' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const store = readStore();
        store.keys[key] = parsed.value;
        writeStore(store);
        sendJson(res, 200, { ok: true });
      } catch (e) { sendJson(res, 400, { error: 'bad json' }); }
    });
    return;
  }
  if (url === '/api/health') return sendJson(res, 200, { ok: true, time: Date.now() });

  // ===== Autenticação (senha com hash; nunca guardamos texto puro) =====
  if (url === '/api/auth/set' && req.method === 'POST') {
    return readBody(req).then(b => {
      if (!b || !b.userId || !b.senha) return sendJson(res, 400, { error: 'dados' });
      setPassword(String(b.userId), String(b.senha));
      sendJson(res, 200, { ok: true });
    });
  }
  if (url === '/api/auth/verify' && req.method === 'POST') {
    return readBody(req).then(b => {
      if (!b || !b.userId) return sendJson(res, 400, { error: 'dados' });
      sendJson(res, 200, { ok: verifyPassword(String(b.userId), String(b.senha || '')) });
    });
  }
  if (url === '/api/auth/clear' && req.method === 'POST') {
    return readBody(req).then(b => {
      if (!b || !b.userId) return sendJson(res, 400, { error: 'dados' });
      if (!verifyPassword(String(b.userId), String(b.senha || ''))) return sendJson(res, 200, { ok: false });
      clearPassword(String(b.userId));
      sendJson(res, 200, { ok: true });
    });
  }

  // ===== Arquivos estáticos =====
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405); res.end('Method not allowed');
});

server.listen(PORT, () => console.log('TCCON Orçamentos rodando na porta ' + PORT));
