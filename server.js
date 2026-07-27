'use strict';

// TCCON — servidor HTTP sem dependências externas.
// Mantém compatibilidade com o frontend legado e protege a persistência local.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createPasswordResetNotifier } = require('./mailer');

const DEFAULT_MAX_BODY_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_STORE_BYTES = 50 * 1024 * 1024;
const MAX_AUTH_BYTES = 1024 * 1024;
const MAX_AUTH_RECORDS = 1000;
const MAX_FAILURE_TRACKERS = 10_000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_FAILURES = 5;
const GATE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_GATE_SESSIONS = 1000;
const RESET_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_RESET_REQUESTS = 3;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_RESET_TOKENS = 20;
const PASSWORD_RESET_EMAIL = 'financeiro@tccon.com.br';
const DEFAULT_GATE_USERNAME = 'tcconorc';
const DEFAULT_GATE_PASSWORD_HASH = 'd7a6525cef4b8a918c57e6e7f08cb63095d10470d48bf392d1e1ca7e1e2baeba';

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

function parsePublicUrl(value) {
  if (value === undefined || value === '') return null;
  let parsed;
  try { parsed = new URL(String(value)); } catch { throw new Error('TCCON_PUBLIC_URL must be a valid URL'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('TCCON_PUBLIC_URL must be an HTTPS origin');
  }
  parsed.pathname = '/';
  return parsed.origin;
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
  const publicUrl = parsePublicUrl(options.publicUrl ?? process.env.TCCON_PUBLIC_URL);
  const gateEnabled = options.gateEnabled !== false;
  const gateUsername = String(options.gateUsername || process.env.TCCON_GATE_USER || DEFAULT_GATE_USERNAME);
  const configuredGatePassword = options.gatePassword || process.env.TCCON_GATE_PASSWORD;
  const initialGatePasswordHash = configuredGatePassword
    ? crypto.createHash('sha256').update(String(configuredGatePassword)).digest('hex')
    : DEFAULT_GATE_PASSWORD_HASH;
  const passwordResetNotifier = options.passwordResetNotifier === undefined
    ? createPasswordResetNotifier()
    : options.passwordResetNotifier;
  const allowedHosts = new Set([
    '127.0.0.1',
    'localhost',
    '::1',
    ...(domain ? [domain] : []),
  ]);
  const storeFile = path.join(dataDir, 'store.json');
  const authFile = path.join(dataDir, 'auth.json');
  const gateFile = path.join(dataDir, 'gate.json');
  const resetFile = path.join(dataDir, 'reset-tokens.json');

  ensureDirectory(dataDir);
  if (!fs.existsSync(publicDir) || !fs.statSync(publicDir).isDirectory()) {
    throw new Error(`Public directory does not exist: ${publicDir}`);
  }
  const indexFile = path.join(publicDir, 'index.html');
  const appVersion = crypto.createHash('sha256')
    .update(fs.readFileSync(indexFile))
    .digest('hex')
    .slice(0, 16);

  let store = readJsonStrict(
    storeFile,
    { keys: {} },
    (value) => isRecord(value) && isRecord(value.keys),
    maxStoreBytes,
  );
  let auth = readJsonStrict(authFile, {}, isAuthStore, MAX_AUTH_BYTES);
  let gateState = readJsonStrict(
    gateFile,
    { passwordHash: initialGatePasswordHash },
    (value) => isRecord(value) && /^[0-9a-f]{64}$/.test(value.passwordHash),
    4096,
  );
  let resetState = readJsonStrict(
    resetFile,
    { tokens: {} },
    (value) => isRecord(value) && isRecord(value.tokens) &&
      Object.keys(value.tokens).length <= MAX_RESET_TOKENS &&
      Object.keys(value.tokens).every((tokenHash) => /^[0-9a-f]{64}$/.test(tokenHash)) &&
      Object.values(value.tokens).every((record) =>
        isRecord(record) && Number.isSafeInteger(record.expiresAt) && record.expiresAt > 0),
    64 * 1024,
  );
  let gatePasswordHash = gateState.passwordHash;
  let shuttingDown = false;
  const authFailures = new Map();
  const resetRequests = new Map();
  const gateSessions = new Map();
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
    res.write(`event: ready\ndata: ${JSON.stringify({
      revision: storeRevision,
      version: appVersion,
    })}\n\n`);

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

  function checkResetRateLimit(req) {
    const key = crypto.createHash('sha256').update(clientAddress(req)).digest('hex');
    const now = Date.now();
    const recent = (resetRequests.get(key) || []).filter(
      (requestedAt) => now - requestedAt < RESET_REQUEST_WINDOW_MS,
    );
    if (recent.length >= MAX_RESET_REQUESTS) {
      const retryAfter = Math.max(
        1,
        Math.ceil((RESET_REQUEST_WINDOW_MS - (now - recent[0])) / 1000),
      );
      throw new HttpError(429, `retry_after_${retryAfter}`);
    }
    return { key, recent, now };
  }

  function recordResetRequest(tracker) {
    if (!resetRequests.has(tracker.key) && resetRequests.size >= MAX_FAILURE_TRACKERS) {
      const oldestKey = resetRequests.keys().next().value;
      if (oldestKey !== undefined) resetRequests.delete(oldestKey);
    }
    resetRequests.set(tracker.key, [...tracker.recent, tracker.now]);
  }

  function parseCookies(req) {
    const cookies = {};
    for (const part of String(req.headers.cookie || '').split(';')) {
      const separator = part.indexOf('=');
      if (separator < 1) continue;
      cookies[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
    }
    return cookies;
  }

  function gateSession(req) {
    if (!gateEnabled) return { authenticated: true };
    const token = parseCookies(req).tccon_session;
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
    const session = gateSessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      gateSessions.delete(token);
      return null;
    }
    return { token, ...session };
  }

  function requireGateSession(req) {
    if (!gateSession(req)) throw new HttpError(401, 'authentication_required');
  }

  function secureCookie(req) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',', 1)[0].trim();
    return forwardedProto === 'https' || Boolean(req.socket.encrypted);
  }

  function sessionCookie(req, token, maxAge) {
    return [
      `tccon_session=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${maxAge}`,
      ...(secureCookie(req) ? ['Secure'] : []),
    ].join('; ');
  }

  function credentialsMatch(username, password) {
    const normalizedUsername = String(username).trim().toLocaleLowerCase('pt-BR');
    const normalizedExpectedUsername = gateUsername.trim().toLocaleLowerCase('pt-BR');
    const usernameHash = crypto.createHash('sha256').update(normalizedUsername).digest();
    const expectedUsernameHash = crypto.createHash('sha256').update(normalizedExpectedUsername).digest();
    const passwordHash = crypto.createHash('sha256').update(String(password)).digest();
    const expectedPasswordHash = Buffer.from(gatePasswordHash, 'hex');
    return crypto.timingSafeEqual(usernameHash, expectedUsernameHash) &&
      crypto.timingSafeEqual(passwordHash, expectedPasswordHash);
  }

  function persistResetState(tokens) {
    resetState = { tokens };
    atomicWriteJson(resetFile, resetState);
  }

  function pruneResetTokens(now = Date.now()) {
    const tokens = Object.fromEntries(
      Object.entries(resetState.tokens).filter(([, record]) => record.expiresAt > now),
    );
    if (Object.keys(tokens).length !== Object.keys(resetState.tokens).length) persistResetState(tokens);
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

    if (decoded === '/redefinir-senha' || decoded === '/redefinir-senha/') {
      decoded = '/reset-password.html';
    } else if (gateEnabled && !gateSession(req)) decoded = '/login.html';
    else if (decoded === '/' || decoded === '') decoded = '/index.html';
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
      'Cache-Control': ['index.html', 'login.html'].includes(path.basename(file))
        ? 'no-store'
        : 'public, max-age=3600',
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

    if (pathname === '/api/version') {
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed');
      return req.method === 'HEAD'
        ? sendEmpty(res, 200, { 'Cache-Control': 'no-store' })
        : sendJson(res, 200, { version: appVersion });
    }

    if (pathname === '/api/gate/session' && req.method === 'GET') {
      return sendJson(res, 200, { authenticated: Boolean(gateSession(req)) });
    }

    if (pathname === '/api/gate/login' && req.method === 'POST') {
      requireSameSite(req);
      const body = await readJsonBody(req);
      const username = body && String(body.usuario || '');
      const password = body && String(body.senha || '');
      if (username.length > 128 || password.length > 256) throw new HttpError(400, 'invalid_credentials');
      const failureTracker = checkAuthRateLimit(req, '__system_gate__');
      const valid = credentialsMatch(username, password);
      recordAuthResult(failureTracker, valid);
      if (!valid) throw new HttpError(401, 'invalid_credentials');
      if (gateSessions.size >= MAX_GATE_SESSIONS) {
        const oldestToken = gateSessions.keys().next().value;
        if (oldestToken) gateSessions.delete(oldestToken);
      }
      const token = crypto.randomBytes(32).toString('hex');
      gateSessions.set(token, { expiresAt: Date.now() + GATE_SESSION_TTL_MS });
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': sessionCookie(req, token, Math.floor(GATE_SESSION_TTL_MS / 1000)),
      });
    }

    if (pathname === '/api/gate/reset' && req.method === 'POST') {
      requireSameSite(req);
      const body = await readJsonBody(req);
      const email = body && String(body.email || '').trim().toLowerCase();
      if (email !== PASSWORD_RESET_EMAIL) throw new HttpError(400, 'invalid_reset_email');
      const tracker = checkResetRateLimit(req);
      if (!passwordResetNotifier) throw new HttpError(503, 'reset_email_unavailable');
      if (!publicUrl) throw new HttpError(503, 'reset_url_unavailable');
      recordResetRequest(tracker);
      pruneResetTokens();
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const entries = Object.entries(resetState.tokens);
      if (entries.length >= MAX_RESET_TOKENS) entries.shift();
      persistResetState({
        ...Object.fromEntries(entries),
        [tokenHash]: { expiresAt: Date.now() + RESET_TOKEN_TTL_MS },
      });
      try {
        await passwordResetNotifier({
          email: PASSWORD_RESET_EMAIL,
          resetUrl: `${publicUrl}/redefinir-senha?token=${token}`,
          requestedAt: new Date().toISOString(),
          address: clientAddress(req),
          userAgent: req.headers['user-agent'],
        });
      } catch (error) {
        logger('error', 'password_reset_notification_failed', {
          errorCode: error.code || error.name || 'Error',
        });
        const remaining = { ...resetState.tokens };
        delete remaining[tokenHash];
        persistResetState(remaining);
        throw new HttpError(503, 'reset_email_unavailable');
      }
      logger('info', 'password_reset_requested', { destination: 'financeiro' });
      return sendJson(res, 202, { ok: true });
    }

    if (pathname === '/api/gate/reset/complete' && req.method === 'POST') {
      requireSameSite(req);
      const body = await readJsonBody(req);
      const token = body && String(body.token || '');
      const password = body && String(body.senha || '');
      if (!/^[0-9a-f]{64}$/.test(token) || password.length < 10 || password.length > 256) {
        throw new HttpError(400, 'invalid_reset');
      }
      pruneResetTokens();
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      if (!Object.hasOwn(resetState.tokens, tokenHash)) throw new HttpError(400, 'invalid_or_expired_token');
      const remaining = { ...resetState.tokens };
      delete remaining[tokenHash];
      persistResetState(remaining);
      gatePasswordHash = crypto.createHash('sha256').update(password).digest('hex');
      gateState = { passwordHash: gatePasswordHash };
      atomicWriteJson(gateFile, gateState);
      gateSessions.clear();
      authFailures.clear();
      logger('info', 'gate_password_reset_completed');
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/gate/logout' && req.method === 'POST') {
      requireSameSite(req);
      const session = gateSession(req);
      if (session && session.token) gateSessions.delete(session.token);
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': sessionCookie(req, '', 0),
      });
    }

    if (pathname.startsWith('/api/')) requireGateSession(req);

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

  return { server, shutdown, paths: { publicDir, dataDir, storeFile, authFile, gateFile, resetFile } };
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
