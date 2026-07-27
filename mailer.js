'use strict';

const crypto = require('node:crypto');
const net = require('node:net');
const os = require('node:os');
const tls = require('node:tls');

const SMTP_TIMEOUT_MS = 10_000;

function validateEmail(value, name) {
  const email = String(value || '').trim();
  if (
    email.length > 254 ||
    /[\r\n]/.test(email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(`${name} must be a valid email address`);
  }
  return email;
}

function parsePort(value) {
  const port = Number(value || 587);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error('TCCON_SMTP_PORT must be a valid TCP port');
  }
  return port;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (String(value).toLowerCase() === 'true') return true;
  if (String(value).toLowerCase() === 'false') return false;
  throw new Error('TCCON_SMTP_SECURE must be true or false');
}

function responseReader(socket) {
  let buffer = '';
  let lines = [];
  const waiting = [];
  const ready = [];
  let terminalError;

  function settle() {
    while (waiting.length && ready.length) waiting.shift().resolve(ready.shift());
    if (terminalError) {
      while (waiting.length) waiting.shift().reject(terminalError);
    }
  }

  function onData(chunk) {
    buffer += chunk.toString('utf8');
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;
      lines.push(line);
      if (match[2] === ' ') {
        ready.push({ code: Number(match[1]), text: lines.join('\n') });
        lines = [];
      }
    }
    settle();
  }

  function onError(error) {
    terminalError = error;
    settle();
  }

  function onEnd() {
    onError(new Error('SMTP connection ended unexpectedly'));
  }

  socket.on('data', onData);
  socket.once('error', onError);
  socket.once('end', onEnd);

  return {
    next() {
      if (ready.length) return Promise.resolve(ready.shift());
      if (terminalError) return Promise.reject(terminalError);
      return new Promise((resolve, reject) => waiting.push({ resolve, reject }));
    },
    dispose() {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('end', onEnd);
    },
  };
}

function withTimeout(promise, socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('SMTP operation timed out'));
    }, SMTP_TIMEOUT_MS);
    timer.unref();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function expectResponse(reader, socket, expected) {
  const response = await withTimeout(reader.next(), socket);
  if (!expected.includes(response.code)) {
    const error = new Error(`SMTP rejected command with status ${response.code}`);
    error.smtpCode = response.code;
    throw error;
  }
  return response;
}

async function command(socket, reader, line, expected) {
  socket.write(`${line}\r\n`);
  return expectResponse(reader, socket, expected);
}

function connectSocket(config) {
  return new Promise((resolve, reject) => {
    const options = {
      host: config.host,
      port: config.port,
      servername: config.host,
      rejectUnauthorized: true,
    };
    const socket = config.secure
      ? tls.connect(options, () => resolve(socket))
      : net.connect(options, () => resolve(socket));
    socket.setTimeout(SMTP_TIMEOUT_MS, () => socket.destroy(new Error('SMTP connection timed out')));
    socket.once('error', reject);
  });
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: host,
      rejectUnauthorized: true,
    }, () => resolve(secureSocket));
    secureSocket.setTimeout(
      SMTP_TIMEOUT_MS,
      () => secureSocket.destroy(new Error('SMTP TLS negotiation timed out')),
    );
    secureSocket.once('error', reject);
  });
}

function encodedHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`;
}

function wrapBase64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
}

async function sendSmtpMessage(config, message) {
  let socket = await withTimeout(connectSocket(config), { destroy() {} });
  let reader = responseReader(socket);

  try {
    await expectResponse(reader, socket, [220]);
    let hello = await command(socket, reader, `EHLO ${config.helloName}`, [250]);

    if (!config.secure) {
      if (!/(?:^|\n)250[ -]STARTTLS(?:\s|$)/i.test(hello.text)) {
        throw new Error('SMTP server does not advertise STARTTLS');
      }
      await command(socket, reader, 'STARTTLS', [220]);
      reader.dispose();
      socket = await upgradeToTls(socket, config.host);
      reader = responseReader(socket);
      hello = await command(socket, reader, `EHLO ${config.helloName}`, [250]);
    }

    if (config.username) {
      await command(socket, reader, 'AUTH LOGIN', [334]);
      await command(socket, reader, Buffer.from(config.username).toString('base64'), [334]);
      await command(socket, reader, Buffer.from(config.password).toString('base64'), [235]);
    }

    await command(socket, reader, `MAIL FROM:<${config.from}>`, [250]);
    await command(socket, reader, `RCPT TO:<${message.to}>`, [250, 251]);
    await command(socket, reader, 'DATA', [354]);

    const headers = [
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${config.helloName}>`,
      `From: ${encodedHeader(config.fromName)} <${config.from}>`,
      `To: <${message.to}>`,
      `Subject: ${encodedHeader(message.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ];
    socket.write(`${headers.join('\r\n')}\r\n\r\n${wrapBase64(message.body)}\r\n.\r\n`);
    await expectResponse(reader, socket, [250]);
    await command(socket, reader, 'QUIT', [221]);
  } finally {
    reader.dispose();
    socket.end();
  }
}

function createPasswordResetNotifier(environment = process.env) {
  const host = String(environment.TCCON_SMTP_HOST || '').trim();
  if (!host) return null;
  if (
    host.length > 253 ||
    /[\s/\\]/.test(host)
  ) {
    throw new Error('TCCON_SMTP_HOST must be a valid hostname');
  }

  const port = parsePort(environment.TCCON_SMTP_PORT);
  const secure = parseBoolean(environment.TCCON_SMTP_SECURE, port === 465);
  const username = String(environment.TCCON_SMTP_USER || '').trim();
  const password = String(environment.TCCON_SMTP_PASSWORD || '');
  if (Boolean(username) !== Boolean(password)) {
    throw new Error('TCCON_SMTP_USER and TCCON_SMTP_PASSWORD must be configured together');
  }

  const from = validateEmail(environment.TCCON_SMTP_FROM || username, 'TCCON_SMTP_FROM');
  const to = validateEmail(
    environment.TCCON_PASSWORD_RESET_TO || 'financeiro@tccon.com.br',
    'TCCON_PASSWORD_RESET_TO',
  );
  const helloName = String(environment.TCCON_SMTP_HELO || os.hostname())
    .replace(/[^A-Za-z0-9.-]/g, '-')
    .slice(0, 253) || 'localhost';
  const config = {
    host,
    port,
    secure,
    username,
    password,
    from,
    fromName: 'TCCON Orçamentos',
    helloName,
  };

  return async ({ username: requestedUsername, requestedAt, address, userAgent }) => {
    const safeUsername = String(requestedUsername).replace(/[\r\n]/g, ' ').slice(0, 128);
    const safeAddress = String(address || 'não identificado').replace(/[\r\n]/g, ' ').slice(0, 128);
    const safeAgent = String(userAgent || 'não identificado').replace(/[\r\n]/g, ' ').slice(0, 300);
    await sendSmtpMessage(config, {
      to,
      subject: 'Solicitação de redefinição de senha — TCCON Orçamentos',
      body: [
        'Foi solicitada uma redefinição de senha no Sistema de Orçamentos TCCON.',
        '',
        `Usuário informado: ${safeUsername}`,
        `Data e hora: ${requestedAt}`,
        `Origem: ${safeAddress}`,
        `Navegador: ${safeAgent}`,
        '',
        'Nenhuma senha foi alterada automaticamente.',
        'Confirme a identidade do solicitante antes de fornecer ou trocar credenciais.',
      ].join('\n'),
    });
  };
}

module.exports = {
  createPasswordResetNotifier,
  sendSmtpMessage,
};
