'use strict';

// TCCON — servidor HTTP sem dependências externas.
// Mantém compatibilidade com o frontend legado e protege a persistência local.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_MAX_BODY_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_STORE_BYTES = 50 * 1024 * 1024;
const MAX_AUTH_BYTES = 1024 * 1024;
const MAX_AUTH_RECORDS = 1000;
const MAX_FAILURE_TRACKERS = 10_000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_FAILURES = 5;

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function logJson(level, event, fields = {}) {
  const record = { timestamp: new Date().toISOString(), level, event, ...fields };
  const output = JSON.stringify(record);
  if (level === 'error') console.error(output);
  else console.log(output);
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    throw new Error(`Data directory is not readable and writable: ${directory}`);
  }
}

function atomicWriteJson(file, value, createBackup = true) {
  const directory = path.dirname(file);
  const temporary = path.join(
    directory,
    `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`,
  );
  const serialized = `${JSON.stringify(value)}\n`;
  let descriptor;

  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, serialized, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;

    if (createBackup && fs.existsSync(file)) {
      fs.copyFileSync(file, `${file}.bak`);
      try { fs.chmodSync(`${file}.bak`, 0o600); } catch {}
    }
    fs.renameSync(temporary, file);
    try { fs.chmodSync(file, 0o600); } catch {}
    try {
      const directoryDescriptor = fs.openSync(directory, 'r');
      try { fs.fsyncSync(directoryDescriptor); } finally { fs.closeSync(directoryDescriptor); }
    } catch {
      // Directory fsync is unavailable on some platforms (notably Windows).
    }
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch {}
    }
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function readJsonStrict(file, initialValue, validator, maxBytes) {
  if (!fs.existsSync(file)) {
    atomicWriteJson(file, initialValue, false);
    return initialValue;
  }

  if (maxBytes && fs.statSync(file).size > maxBytes) {
    throw new Error(`${path.basename(file)} exceeds its configured size limit`);
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!validator(parsed)) throw new Error(`Invalid data structure in ${path.basename(file)}`);
  try { fs.chmodSync(file, 0o600); } catch {}
  return parsed;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isAuthStore(value) {
  return isRecord(value) &&
    Object.keys(value).length <= MAX_AUTH_RECORDS &&
    Object.values(value).every((record) =>
      isRecord(record) &&
      typeof record.salt === 'string' &&
      /^[0-9a-f]{32}$/.test(record.salt) &&
      typeof record.hash === 'string' &&
      /^[0-9a-f]{128}$/.test(record.hash));
}

function parseDomain(value) {
  if (value === undefined || value === '') return null;
  const domain = String(value).trim().toLowerCase();
  if (
    domain.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)
  ) {
    throw new Error('TCCON_DOMAIN must be a valid hostname without protocol or path');
  }
  return domain;
}

function createApplication(options = {}) {
  const publicDir = path.resolve(options.publicDir || process.env.PUBLIC_DIR || path.join(__dirname, 'public'));
  const dataDir = path.resolve(options.dataDir || process.env.DATA_DIR || path.join(__dirname, 'data'));
  const maxBodyBytes = parsePositiveInteger(
    options.maxBodyBytes ?? process.env.MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES,
    'MAX_BODY_BYTES',
  );
  const maxStoreBytes = parsePositiveInteger(
    options.maxStoreBytes ?? process.env.MAX_STORE_BYTES,
    DEFAULT_MAX_STORE_BYTES,
    'MAX_STORE_BYTES',
  );
  const logger = options.logger || logJson;
  const domain = parseDomain(options.domain ?? process.env.TCCON_DOMAIN);
  const allowedHosts = new Set([
    '127.0.0.1',
    'localhost',
    '::1',
    ...(domain ? [domain] : []),
  ]);
  const storeFile = path.join(dataDir, 'store.json');
  const authFile = path.join(dataDir, 'auth.json');

  ensureDirectory(dataDir);
  if (!fs.existsSync(publicDir) || !fs.statSync(publicDir).isDirectory()) {
    throw new Error(`Public directory does not exist: ${publicDir}`);
  }

  let store = readJsonStrict(
    storeFile,
    { keys: {} },
    (value) => isRecord(value) && isRecord(value.keys),
    maxStoreBytes,
  );
  let auth = readJsonStrict(authFile, {}, isAuthStore, MAX_AUTH_BYTES);
  let shuttingDown = false;
  const authFailures = new Map();
  const storeSubscribers = new Set();
  let storeRevision = 0;

  function removeStoreSubscriber(subscriber) {
    if (!storeSubscribers.delete(subscriber)) return;
    clearInterval(subscriber.heartbeat);
  }

  function subscribeToStore(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ revision: storeRevision })}\n\n`);

    const subscriber = { res, heartbeat: undefined };
    subscriber.heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        removeStoreSubscriber(subscriber);
      }
    }, 20_000);
    subscriber.heartbeat.unref();
    storeSubscribers.add(subscriber);
    req.once('close', () => removeStoreSubscriber(subscriber));
  }

  function broadcastStoreChange(key) {
    storeRevision += 1;
    const message = `id: ${storeRevision}\nevent: change\ndata: ${JSON.stringify({ key, revision: storeRevision })}\n\n`;
    for (const subscriber of storeSubscribers) {
      try {
        subscriber.res.write(message);
      } catch {
        removeStoreSubscriber(subscriber);
      }
    }
  }

  function persistStore(nextStore) {
    const size = Buffer.byteLength(JSON.stringify(nextStore));
    if (size > maxStoreBytes) throw new HttpError(413, 'store_too_large');
    atomicWriteJson(storeFile, nextStore);
    store = nextStore;
  }

  function persistAuth(nextAuth) {
    if (!isAuthStore(nextAuth)) throw new HttpError(413, 'auth_store_limit');
    atomicWriteJson(authFile, nextAuth);
    auth = nextAuth;
  }

  function hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.scrypt(String(password), salt, 64, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey.toString('hex'));
      });
    });
  }

  async function setPassword(userId, password) {
    if (!Object.hasOwn(auth, userId) && Object.keys(auth).length >= MAX_AUTH_RECORDS) {
      throw new HttpError(413, 'auth_store_limit');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await hashPassword(password, salt);
    persistAuth({ ...auth, [userId]: { salt, hash } });
  }

  async function verifyPassword(userId, password) {
    const record = auth[userId];
    if (!isRecord(record) || typeof record.salt !== 'string' || typeof record.hash !== 'string') {
      return false;
    }
    const actual = Buffer.from(await hashPassword(password, record.salt), 'hex');
    const expected = Buffer.from(record.hash, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  function clearPassword(userId) {
    const nextAuth = { ...auth };
    delete nextAuth[userId];
    persistAuth(nextAuth);
  }

  function securityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' blob: data:; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; " +
      "form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:",
    );
  }

  function sendJson(res, status, value, extraHeaders = {}) {
    const body = JSON.stringify(value);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    });
    res.end(body);
  }

  function sendEmpty(res, status, extraHeaders = {}) {
    res.writeHead(status, extraHeaders);
    res.end();
  }

  async function readJsonBody(req) {
    const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') throw new HttpError(415, 'json_required');

    const declaredLength = Number(req.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      throw new HttpError(413, 'body_too_large');
    }

    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > maxBodyBytes) throw new HttpError(413, 'body_too_large');
      chunks.push(chunk);
    }

    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      throw new HttpError(400, 'bad_json');
    }
  }

  function validateUserId(value) {
    return typeof value === 'string' && value.length >= 1 && value.length <= 128 &&
      /^[A-Za-z0-9_-]+$/.test(value);
  }

  function validatePassword(value) {
    return typeof value === 'string' && value.length >= 1 && value.length <= 256;
  }

  function clientAddress(req) {
    return req.socket.remoteAddress || 'unknown';
  }

  function failureKey(req, userId) {
    return crypto.createHash('sha256').update(`${clientAddress(req)}\0${userId}`).digest('hex');
  }

  function checkAuthRateLimit(req, userId) {
    const key = failureKey(req, userId);
    const now = Date.now();
    const current = authFailures.get(key);
    if (!current || now - current.startedAt >= AUTH_WINDOW_MS) {
      authFailures.delete(key);
      return key;
    }
    if (current.count >= AUTH_MAX_FAILURES) {
      const retryAfter = Math.max(1, Math.ceil((AUTH_WINDOW_MS - (now - current.startedAt)) / 1000));
      throw new HttpError(429, `retry_after_${retryAfter}`);
    }
    return key;
  }

  function recordAuthResult(key, success) {
    if (success) {
      authFailures.delete(key);
      return;
    }
    const current = authFailures.get(key);
    if (!current && authFailures.size >= MAX_FAILURE_TRACKERS) {
      const oldestKey = authFailures.keys().next().value;
      if (oldestKey !== undefined) authFailures.delete(oldestKey);
    }
    authFailures.set(key, current
      ? { ...current, count: current.count + 1 }
      : { count: 1, startedAt: Date.now() });
  }

  function requireSameSite(req) {
    if (String(req.headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') {
      throw new HttpError(403, 'cross_site_request_denied');
    }
  }

  function requireAllowedHost(req) {
    const host = String(req.headers.host || '');
    let hostname;
    try {
      hostname = new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, '').toLowerCase();
    } catch {
      throw new HttpError(400, 'invalid_host');
    }
    if (domain && !allowedHosts.has(hostname)) {
      throw new HttpError(421, 'misdirected_request');
    }
  }

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };

  async function serveStatic(req, res, pathname) {
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      throw new HttpError(400, 'bad_url_encoding');
    }
    if (decoded.includes('\0')) throw new HttpError(400, 'bad_path');

    if (decoded === '/' || decoded === '') decoded = '/index.html';
    const candidate = path.resolve(publicDir, `.${decoded.replaceAll('\\', '/')}`);
    const relative = path.relative(publicDir, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new HttpError(403, 'forbidden');
    }

    let file = candidate;
    try {
      if (!fs.statSync(file).isFile()) throw new Error('not_file');
    } catch {
      file = path.join(publicDir, 'index.html');
    }

    let data;
    try {
      data = await fs.promises.readFile(file);
    } catch (error) {
      if (error.code === 'ENOENT') throw new HttpError(404, 'not_found');
      throw error;
    }

    const headers = {
      'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': path.basename(file) === 'index.html' ? 'no-store' : 'public, max-age=3600',
    };
    if (req.method === 'HEAD') return sendEmpty(res, 200, headers);
    res.writeHead(200, headers);
    res.end(data);
  }

  async function route(req, res) {
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, 'http://localhost');
    } catch {
      throw new HttpError(400, 'bad_url');
    }
    const pathname = parsedUrl.pathname;
    requireAllowedHost(req);

    if (pathname === '/api/health') {
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed');
      return req.method === 'HEAD'
        ? sendEmpty(res, 200, { 'Cache-Control': 'no-store' })
        : sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/ready') {
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed');
      let ready = !shuttingDown;
      try { fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK); } catch { ready = false; }
      const status = ready ? 200 : 503;
      return req.method === 'HEAD'
        ? sendEmpty(res, status, { 'Cache-Control': 'no-store' })
        : sendJson(res, status, { ok: ready });
    }

    if (pathname === '/api/store' && req.method === 'GET') {
      return sendJson(res, 200, store);
    }

    if (pathname === '/api/events') {
      if (req.method !== 'GET') throw new HttpError(405, 'method_not_allowed');
      return subscribeToStore(req, res);
    }

    if (pathname.startsWith('/api/store/')) {
      let key;
      try {
        key = decodeURIComponent(pathname.slice('/api/store/'.length));
      } catch {
        throw new HttpError(400, 'bad_url_encoding');
      }
      if (!/^tccon_[A-Za-z0-9_-]{1,160}$/.test(key)) throw new HttpError(400, 'invalid_key');
      if (req.method === 'GET') {
        if (!Object.hasOwn(store.keys, key)) throw new HttpError(404, 'key_not_found');
        return sendJson(res, 200, { value: store.keys[key] });
      }
      if (req.method !== 'PUT') throw new HttpError(405, 'method_not_allowed');
      requireSameSite(req);
      const body = await readJsonBody(req);
      if (!isRecord(body) || !Object.hasOwn(body, 'value')) throw new HttpError(400, 'invalid_body');
      persistStore({ keys: { ...store.keys, [key]: body.value } });
      broadcastStoreChange(key);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/auth/set' && req.method === 'POST') {
      requireSameSite(req);
      const body = await readJsonBody(req);
      const userId = body && String(body.userId || '');
      const password = body && String(body.senha || '');
      if (!validateUserId(userId) || !validatePassword(password)) throw new HttpError(400, 'invalid_credentials');
      if (Object.hasOwn(auth, userId)) {
        const currentPassword = body && String(body.senhaAtual || '');
        if (!validatePassword(currentPassword)) throw new HttpError(401, 'current_password_required');
        const key = checkAuthRateLimit(req, userId);
        const verified = await verifyPassword(userId, currentPassword);
        recordAuthResult(key, verified);
        if (!verified) throw new HttpError(401, 'invalid_current_password');
      }
      await setPassword(userId, password);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/auth/verify' && req.method === 'POST') {
      requireSameSite(req);
      const body = await readJsonBody(req);
      const userId = body && String(body.userId || '');
      const password = body && String(body.senha || '');
      if (!validateUserId(userId) || password.length > 256) throw new HttpError(400, 'invalid_credentials');
      const key = checkAuthRateLimit(req, userId);
      const ok = await verifyPassword(userId, password);
      recordAuthResult(key, ok);
      return sendJson(res, 200, { ok });
    }

    if (pathname === '/api/auth/clear' && req.method === 'POST') {
      requireSameSite(req);
      const body = await readJsonBody(req);
      const userId = body && String(body.userId || '');
      const password = body && String(body.senha || '');
      if (!validateUserId(userId) || password.length > 256) throw new HttpError(400, 'invalid_credentials');
      const key = checkAuthRateLimit(req, userId);
      const ok = await verifyPassword(userId, password);
      recordAuthResult(key, ok);
      if (!ok) return sendJson(res, 200, { ok: false });
      clearPassword(userId);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname.startsWith('/api/')) throw new HttpError(404, 'api_not_found');
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, pathname);
    throw new HttpError(405, 'method_not_allowed');
  }

  const server = http.createServer((req, res) => {
    securityHeaders(res);
    const requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', requestId);

    route(req, res).catch((error) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = error instanceof HttpError ? error.status : 500;
      let code = error instanceof HttpError ? error.code : 'internal_error';
      const headers = {};
      if (status === 429 && code.startsWith('retry_after_')) {
        headers['Retry-After'] = code.slice('retry_after_'.length);
        code = 'too_many_attempts';
      }
      if (status >= 500) {
        logger('error', 'request_failed', {
          requestId,
          method: req.method,
          pathname: String(req.url || '').split('?', 1)[0].slice(0, 200),
          errorCode: error.code || error.name || 'Error',
        });
      }
      sendJson(res, status, { error: code }, headers);
    });
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 1_000;

  async function shutdown(signal = 'manual') {
    if (shuttingDown) return;
    shuttingDown = true;
    logger('info', 'shutdown_started', { signal });
    for (const subscriber of storeSubscribers) {
      removeStoreSubscriber(subscriber);
      subscriber.res.end();
    }
    await new Promise((resolve) => {
      const forceTimer = setTimeout(() => {
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
        resolve();
      }, 10_000);
      forceTimer.unref();
      server.close(() => {
        clearTimeout(forceTimer);
        resolve();
      });
      if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
    });
    logger('info', 'shutdown_complete', { signal });
  }

  return { server, shutdown, paths: { publicDir, dataDir, storeFile, authFile } };
}

function startFromEnvironment() {
  const port = parsePositiveInteger(process.env.PORT, 3000, 'PORT');
  if (port > 65_535) throw new Error('PORT must be between 1 and 65535');
  const host = process.env.HOST || '127.0.0.1';
  const application = createApplication();
  const { server, shutdown } = application;

  server.on('error', (error) => {
    logJson('error', 'server_error', { errorCode: error.code || error.name || 'Error' });
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    logJson('info', 'server_started', { host, port, node: process.version });
  });

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => {
      shutdown(signal)
        .then(() => { process.exitCode = 0; })
        .catch((error) => {
          logJson('error', 'shutdown_failed', { errorCode: error.code || error.name || 'Error' });
          process.exitCode = 1;
        });
    });
  }

  return application;
}

if (require.main === module) {
  try {
    startFromEnvironment();
  } catch (error) {
    logJson('error', 'startup_failed', { errorCode: error.code || error.name || 'Error' });
    process.exitCode = 1;
  }
}

module.exports = {
  HttpError,
  atomicWriteJson,
  createApplication,
  startFromEnvironment,
};
