'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { renderTraefikConfig, validate } = require('../scripts/render-traefik-config');

const TEMPLATE = path.resolve(__dirname, '..', 'deploy', 'traefik-dynamic.yml.template');

test('Traefik configuration is rendered from validated environment values', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tccon-traefik-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const envPath = path.join(directory, '.env');
  const outputPath = path.join(directory, 'tccon.yml');
  fs.writeFileSync(envPath, [
    'TCCON_DOMAIN=Orcamentos.Example.com',
    'TCCON_BACKEND_URL=http://10.20.0.15:3000/',
    'TRAEFIK_ENTRYPOINT=websecure',
    'TRAEFIK_CERT_RESOLVER=letsencrypt',
    'TRAEFIK_AUTH_USERS_FILE=/etc/traefik/tccon-users',
    '',
  ].join('\n'));

  renderTraefikConfig({ envPath, outputPath, templatePath: TEMPLATE });
  const rendered = fs.readFileSync(outputPath, 'utf8');

  assert.match(rendered, /Host\(`orcamentos\.example\.com`\)/);
  assert.match(rendered, /url: "http:\/\/10\.20\.0\.15:3000"/);
  assert.match(rendered, /usersFile: "\/etc\/traefik\/tccon-users"/);
  assert.match(rendered, /PathPrefix\(`\/api\/auth\/`\)/);
  assert.equal(rendered.includes('${'), false);
});

test('Traefik configuration rejects unsafe domain and backend values', () => {
  const base = {
    TCCON_DOMAIN: 'orcamentos.example.com',
    TCCON_BACKEND_URL: 'http://10.20.0.15:3000',
    TRAEFIK_ENTRYPOINT: 'websecure',
    TRAEFIK_CERT_RESOLVER: 'letsencrypt',
    TRAEFIK_AUTH_USERS_FILE: '/etc/traefik/tccon-users',
  };

  assert.throws(
    () => validate({ ...base, TCCON_DOMAIN: 'https://example.com' }),
    /TCCON_DOMAIN/,
  );
  assert.throws(
    () => validate({ ...base, TCCON_BACKEND_URL: 'http://user:pass@10.20.0.15:3000/api' }),
    /without credentials or path/,
  );
});
