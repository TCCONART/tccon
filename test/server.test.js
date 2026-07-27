'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApplication } = require('../server');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

function request(server, pathname, options = {}) {
  const address = server.address();
  const body = options.body === undefined
    ? undefined
    : (typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
  const headers = { ...(options.headers || {}) };
  if (body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: address.port,
      method: options.method || 'GET',
      path: pathname,
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try { json = text ? JSON.parse(text) : undefined; } catch {}
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function fixture(t, options = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tccon-test-'));
  const application = createApplication({
    dataDir,
    publicDir: PUBLIC_DIR,
    logger: () => {},
    gateEnabled: false,
    ...options,
  });
  await new Promise((resolve) => application.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await application.shutdown('test');
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  return application;
}

test('system access requires a valid gate login and protected session cookie', async (t) => {
  const { server } = await fixture(t, {
    gateEnabled: true,
    gateUsername: 'system-user',
    gatePassword: 'system-password',
  });

  const denied = await request(server, '/api/store');
  assert.equal(denied.status, 401);
  assert.equal(denied.json.error, 'authentication_required');

  const initial = await request(server, '/api/gate/session');
  assert.deepEqual(initial.json, { authenticated: false });
  const lockedPage = await request(server, '/');
  assert.match(lockedPage.text, /Acesso ao sistema/);
  assert.doesNotMatch(lockedPage.text, /Quem est.+ atendendo/);

  const rejected = await request(server, '/api/gate/login', {
    method: 'POST',
    body: { usuario: 'system-user', senha: 'wrong-password' },
  });
  assert.equal(rejected.status, 401);

  const login = await request(server, '/api/gate/login', {
    method: 'POST',
    headers: { 'X-Forwarded-Proto': 'https' },
    body: { usuario: 'system-user', senha: 'system-password' },
  });
  assert.equal(login.status, 200);
  assert.equal(login.json.ok, true);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/);
  assert.match(login.headers['set-cookie'][0], /SameSite=Strict/);
  assert.match(login.headers['set-cookie'][0], /Secure/);
  const cookie = login.headers['set-cookie'][0].split(';', 1)[0];

  const allowed = await request(server, '/api/store', { headers: { Cookie: cookie } });
  assert.equal(allowed.status, 200);
  const active = await request(server, '/api/gate/session', { headers: { Cookie: cookie } });
  assert.deepEqual(active.json, { authenticated: true });
  const unlockedPage = await request(server, '/', { headers: { Cookie: cookie } });
  assert.match(unlockedPage.text, /Quem est.+ atendendo/);
});

test('password reset requests notify finance without exposing or changing passwords', async (t) => {
  const notifications = [];
  const { server } = await fixture(t, {
    gateEnabled: true,
    gateUsername: 'system-user',
    gatePassword: 'system-password',
    passwordResetNotifier: async (requestDetails) => notifications.push(requestDetails),
  });

  const requested = await request(server, '/api/gate/reset', {
    method: 'POST',
    headers: { 'User-Agent': 'TCCON test browser' },
    body: { usuario: 'system-user' },
  });
  assert.equal(requested.status, 202);
  assert.deepEqual(requested.json, { ok: true });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].username, 'system-user');
  assert.equal(notifications[0].userAgent, 'TCCON test browser');
  assert.match(notifications[0].requestedAt, /^\d{4}-\d{2}-\d{2}T/);

  const stillValid = await request(server, '/api/gate/login', {
    method: 'POST',
    body: { usuario: 'system-user', senha: 'system-password' },
  });
  assert.equal(stillValid.status, 200);

  const crossSite = await request(server, '/api/gate/reset', {
    method: 'POST',
    headers: { 'Sec-Fetch-Site': 'cross-site' },
    body: { usuario: 'system-user' },
  });
  assert.equal(crossSite.status, 403);

  for (let index = 0; index < 2; index += 1) {
    const additional = await request(server, '/api/gate/reset', {
      method: 'POST',
      body: { usuario: 'system-user' },
    });
    assert.equal(additional.status, 202);
  }
  const limited = await request(server, '/api/gate/reset', {
    method: 'POST',
    body: { usuario: 'system-user' },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.json.error, 'too_many_attempts');
});

test('password reset reports an unavailable email service safely', async (t) => {
  const { server } = await fixture(t, {
    gateEnabled: true,
    passwordResetNotifier: null,
  });
  const response = await request(server, '/api/gate/reset', {
    method: 'POST',
    body: { usuario: 'system-user' },
  });
  assert.equal(response.status, 503);
  assert.equal(response.json.error, 'reset_email_unavailable');
});

test('health, readiness and static responses are hardened', async (t) => {
  const { server } = await fixture(t);

  const health = await request(server, '/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.json, { ok: true });
  assert.equal(health.headers['cache-control'], 'no-store');
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.equal(health.headers['x-frame-options'], 'SAMEORIGIN');
  assert.ok(health.headers['content-security-policy'].includes("object-src 'none'"));
  assert.ok(health.headers['content-security-policy'].includes("'unsafe-eval'"));
  assert.match(health.headers['x-request-id'], /^[0-9a-f-]{36}$/);

  const ready = await request(server, '/api/ready');
  assert.equal(ready.status, 200);
  assert.deepEqual(ready.json, { ok: true });

  const page = await request(server, '/');
  assert.equal(page.status, 200);
  assert.match(page.headers['content-type'], /^text\/html/);
  assert.equal(page.headers['cache-control'], 'no-store');

  const head = await request(server, '/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.text, '');
});

test('store writes preserve concurrent keys and are durable before success', async (t) => {
  const { server, paths } = await fixture(t);

  const [first, second] = await Promise.all([
    request(server, '/api/store/tccon_first', { method: 'PUT', body: { value: { n: 1 } } }),
    request(server, '/api/store/tccon_second', { method: 'PUT', body: { value: { n: 2 } } }),
  ]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);

  const response = await request(server, '/api/store');
  assert.deepEqual(response.json.keys.tccon_first, { n: 1 });
  assert.deepEqual(response.json.keys.tccon_second, { n: 2 });

  const disk = JSON.parse(fs.readFileSync(paths.storeFile, 'utf8'));
  assert.deepEqual(disk, response.json);
  assert.equal(fs.existsSync(`${paths.storeFile}.bak`), true);
});

test('store changes are published to connected browsers in real time', async (t) => {
  const { server } = await fixture(t);
  const address = server.address();
  const eventRequest = http.request({
    host: '127.0.0.1',
    port: address.port,
    path: '/api/events',
    headers: { Accept: 'text/event-stream' },
  });

  const eventResponse = await new Promise((resolve, reject) => {
    eventRequest.once('response', resolve);
    eventRequest.once('error', reject);
    eventRequest.end();
  });
  t.after(() => eventResponse.destroy());
  assert.equal(eventResponse.statusCode, 200);
  assert.match(eventResponse.headers['content-type'], /^text\/event-stream/);

  let eventText = '';
  const changed = new Promise((resolve) => {
    eventResponse.on('data', (chunk) => {
      eventText += chunk.toString('utf8');
      if (eventText.includes('event: change')) resolve();
    });
  });
  const written = await request(server, '/api/store/tccon_live', {
    method: 'PUT',
    body: { value: { updated: true } },
  });
  assert.equal(written.status, 200);
  await changed;
  assert.match(eventText, /"key":"tccon_live"/);

  const single = await request(server, '/api/store/tccon_live');
  assert.equal(single.status, 200);
  assert.deepEqual(single.json, { value: { updated: true } });
});

test('invalid input and API routes fail safely', async (t) => {
  const { server } = await fixture(t, { maxBodyBytes: 32 });

  const mediaType = await request(server, '/api/store/tccon_key', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: '{}',
  });
  assert.equal(mediaType.status, 415);
  assert.equal(mediaType.json.error, 'json_required');

  const tooLarge = await request(server, '/api/store/tccon_key', {
    method: 'PUT',
    body: { value: 'x'.repeat(50) },
  });
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.json.error, 'body_too_large');

  const invalidKey = await request(server, '/api/store/not_allowed', {
    method: 'PUT',
    body: { value: 1 },
  });
  assert.equal(invalidKey.status, 400);

  const malformed = await request(server, '/bad%zz');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.error, 'bad_url_encoding');

  const unknownApi = await request(server, '/api/unknown');
  assert.equal(unknownApi.status, 404);
  assert.equal(unknownApi.json.error, 'api_not_found');
});

test('cross-site state changes are rejected', async (t) => {
  const { server } = await fixture(t);
  const response = await request(server, '/api/store/tccon_key', {
    method: 'PUT',
    headers: { 'Sec-Fetch-Site': 'cross-site' },
    body: { value: 1 },
  });
  assert.equal(response.status, 403);
  assert.equal(response.json.error, 'cross_site_request_denied');
});

test('configured domain restricts forwarded Host without breaking local healthchecks', async (t) => {
  const { server } = await fixture(t, { domain: 'orcamentos.example.com' });

  const publicHost = await request(server, '/api/health', {
    headers: { Host: 'orcamentos.example.com' },
  });
  assert.equal(publicHost.status, 200);

  const localHealthcheck = await request(server, '/api/ready');
  assert.equal(localHealthcheck.status, 200);

  const unexpectedHost = await request(server, '/api/health', {
    headers: { Host: 'outro.example.com' },
  });
  assert.equal(unexpectedHost.status, 421);
  assert.equal(unexpectedHost.json.error, 'misdirected_request');
});

test('startup rejects an invalid public domain', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tccon-domain-'));
  assert.throws(
    () => createApplication({
      dataDir,
      publicDir: PUBLIC_DIR,
      domain: 'https://orcamentos.example.com/path',
      logger: () => {},
    }),
    /TCCON_DOMAIN/,
  );
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('password hashes persist and verification is rate limited', async (t) => {
  const { server, paths } = await fixture(t);
  const created = await request(server, '/api/auth/set', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'test-password' },
  });
  assert.equal(created.status, 200);

  const authDisk = fs.readFileSync(paths.authFile, 'utf8');
  assert.equal(authDisk.includes('test-password'), false);

  const verified = await request(server, '/api/auth/verify', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'test-password' },
  });
  assert.deepEqual(verified.json, { ok: true });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failed = await request(server, '/api/auth/verify', {
      method: 'POST',
      body: { userId: 'user-1', senha: 'wrong' },
    });
    assert.equal(failed.status, 200);
    assert.deepEqual(failed.json, { ok: false });
  }
  const limited = await request(server, '/api/auth/verify', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'wrong' },
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.json.error, 'too_many_attempts');
  assert.ok(Number(limited.headers['retry-after']) > 0);
});

test('an existing password can only be changed with the current password', async (t) => {
  const { server } = await fixture(t);
  await request(server, '/api/auth/set', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'original-password' },
  });

  const missingProof = await request(server, '/api/auth/set', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'attacker-password' },
  });
  assert.equal(missingProof.status, 401);
  assert.equal(missingProof.json.error, 'current_password_required');

  const wrongProof = await request(server, '/api/auth/set', {
    method: 'POST',
    body: {
      userId: 'user-1',
      senha: 'attacker-password',
      senhaAtual: 'wrong-password',
    },
  });
  assert.equal(wrongProof.status, 401);
  assert.equal(wrongProof.json.error, 'invalid_current_password');

  const changed = await request(server, '/api/auth/set', {
    method: 'POST',
    body: {
      userId: 'user-1',
      senha: 'replacement-password',
      senhaAtual: 'original-password',
    },
  });
  assert.equal(changed.status, 200);

  const oldPassword = await request(server, '/api/auth/verify', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'original-password' },
  });
  assert.deepEqual(oldPassword.json, { ok: false });

  const newPassword = await request(server, '/api/auth/verify', {
    method: 'POST',
    body: { userId: 'user-1', senha: 'replacement-password' },
  });
  assert.deepEqual(newPassword.json, { ok: true });
});

test('startup refuses a corrupt store instead of silently replacing it', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tccon-corrupt-'));
  fs.writeFileSync(path.join(dataDir, 'store.json'), '{broken', 'utf8');
  assert.throws(
    () => createApplication({ dataDir, publicDir: PUBLIC_DIR, logger: () => {} }),
    SyntaxError,
  );
  assert.equal(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8'), '{broken');
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('startup rejects persisted data that exceeds the configured limit', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tccon-oversized-'));
  const storeFile = path.join(dataDir, 'store.json');
  fs.writeFileSync(storeFile, JSON.stringify({ keys: { tccon_key: 'x'.repeat(200) } }), 'utf8');
  assert.throws(
    () => createApplication({
      dataDir,
      publicDir: PUBLIC_DIR,
      logger: () => {},
      maxStoreBytes: 64,
    }),
    /exceeds its configured size limit/,
  );
  fs.rmSync(dataDir, { recursive: true, force: true });
});
