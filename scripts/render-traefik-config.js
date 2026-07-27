'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`Invalid .env line: ${rawLine}`);
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function validate(values) {
  const required = [
    'TCCON_DOMAIN',
    'TCCON_BACKEND_URL',
    'TRAEFIK_ENTRYPOINT',
    'TRAEFIK_CERT_RESOLVER',
    'TRAEFIK_AUTH_USERS_FILE',
  ];
  for (const key of required) {
    if (!values[key]) throw new Error(`${key} is required`);
  }

  const domain = values.TCCON_DOMAIN.toLowerCase();
  if (
    domain.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)
  ) {
    throw new Error('TCCON_DOMAIN must be a valid hostname without protocol or path');
  }
  values.TCCON_DOMAIN = domain;

  let backend;
  try {
    backend = new URL(values.TCCON_BACKEND_URL);
  } catch {
    throw new Error('TCCON_BACKEND_URL must be a valid HTTP(S) URL');
  }
  if (
    !['http:', 'https:'].includes(backend.protocol) ||
    backend.username ||
    backend.password ||
    (backend.pathname && backend.pathname !== '/') ||
    backend.search ||
    backend.hash
  ) {
    throw new Error('TCCON_BACKEND_URL must be an HTTP(S) origin without credentials or path');
  }
  values.TCCON_BACKEND_URL = backend.origin;

  for (const key of ['TRAEFIK_ENTRYPOINT', 'TRAEFIK_CERT_RESOLVER']) {
    if (!/^[A-Za-z0-9_-]+$/.test(values[key])) {
      throw new Error(`${key} contains unsupported characters`);
    }
  }
  if (!path.posix.isAbsolute(values.TRAEFIK_AUTH_USERS_FILE)) {
    throw new Error('TRAEFIK_AUTH_USERS_FILE must be an absolute path on the Traefik VPS');
  }
}

function renderTraefikConfig({ envPath, outputPath, templatePath }) {
  const values = parseEnv(fs.readFileSync(envPath, 'utf8'));
  validate(values);
  const template = fs.readFileSync(templatePath, 'utf8');
  const rendered = template.replace(/\$\{([A-Z0-9_]+)\}/g, (placeholder, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing template value: ${key}`);
    return values[key].replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  });
  if (rendered.includes('${')) throw new Error('The rendered configuration still has placeholders');

  const temporary = `${outputPath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  try {
    fs.writeFileSync(temporary, rendered, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, outputPath);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
  return outputPath;
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const output = renderTraefikConfig({
    envPath: path.resolve(argument('--env', path.join(root, '.env'))),
    outputPath: path.resolve(
      argument('--output', path.join(root, 'deploy', 'traefik-dynamic.generated.yml')),
    ),
    templatePath: path.join(root, 'deploy', 'traefik-dynamic.yml.template'),
  });
  process.stdout.write(`${output}\n`);
}

module.exports = { parseEnv, renderTraefikConfig, validate };
