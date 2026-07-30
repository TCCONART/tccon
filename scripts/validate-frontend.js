'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function validateFrontend(bundlePath = path.resolve(__dirname, '..', 'public', 'index.html')) {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  const login = fs.readFileSync(path.resolve(path.dirname(bundlePath), 'login.html'), 'utf8');
  const resetPage = fs.readFileSync(path.resolve(path.dirname(bundlePath), 'reset-password.html'), 'utf8');
  const templateMatch = bundle.match(
    /<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/,
  );
  const manifestMatch = bundle.match(
    /<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/,
  );
  if (!templateMatch || !manifestMatch) throw new Error('Bundle metadata is incomplete');

  const template = JSON.parse(templateMatch[1]);
  const manifest = JSON.parse(manifestMatch[1]);
  const requiredTemplateMarkers = [
    '<html lang="pt-BR">',
    '<title>TCCON Orçamentos</title>',
    'class="login-grid"',
    'class="app-toolbar"',
    'class="data-table"',
    'role="status" aria-live="polite"',
    '__tccon_pending_sync',
    'mergePendingUsers(remote,local)',
    "k==='tccon_users'&&Object.hasOwn(pending,k)",
    'startRealtime',
    "new EventSource(this.apiBase()+'/events')",
    'refreshKey(k)',
    'loginGate',
    'showGate',
    'Acesso ao sistema',
    'migrateLocalPasswords',
    'senhaAtual',
    'Ajustar foto no ícone',
    'onMeFotoZoom',
    'avatarStyle',
    'width:96px;height:96px;border-radius:50%',
    'width:128px;height:128px',
    'startVersionPolling',
    "this.apiBase()+'/version'",
    'window.location.reload()',
    'reloadForUpdate',
    'draftKey(id)',
    'tccon_rascunho_',
    'saveDraftNow',
    'componentDidUpdate(prevProps,prevState)',
    "window.addEventListener('beforeunload'",
    '>Salvar em PDF</button>',
    "cliente+' - orçamento '+numero",
    'salvarPdf:()=>this.savePdf()',
    '>Enviar por e-mail</button>',
    'title="O PDF deve ser anexado manualmente"',
    'sendQuoteEmail(){',
    "enviarEmail:()=>this.sendQuoteEmail()",
    "'mailto:?subject='",
    'TCCON ARTEFATOS DE CONCRETO.',
    'font-weight:700;font-size:20px;color:var(--accent,#2f5d86);">{{ margemVendaStr }}',
    'placeholder="0 ou 10%"',
    "descontoTexto.includes('%')",
    "descontoModoStr",
    'aria-label="Atualizar página"',
    'atualizarPagina:()=>{this.saveDraftNow();window.location.reload();}',
    '>Quantidade total</span>',
    'const quantidadeTotal=s.itens.reduce((a,it)=>a+this.num(it.qtd),0);',
    "quantidadeTotalStr:quantidadeTotal.toLocaleString('pt-BR',{maximumFractionDigits:3})",
    'data-quantity-total="editor"',
    'data-quantity-position="description"',
    'data-quantity-total="print"',
    'data-romaneio-page="true"',
    '>Romaneio</button>',
    'tccon_romaneios_',
    'saveRomaneio(){',
    'importCurrentQuote(){',
    'romPesoTotalStr',
    'imprimirRomaneio',
    "pageStyle.textContent='@page{size:A4 portrait;margin:5mm;}'",
    'zoom:1;width:100%',
    'grid-template-columns:42px 44px minmax(180px,1fr) 68px 74px 68px 76px 0',
    'romaneio-client-grid',
    'romaneio-summary-grid',
    'romFornecedor:{nome:',
    'toggleTcconFornecedor(){',
    'tccon-romaneio-logo',
    'tccon-romaneio-button-logo',
    'romaneio-supplier-grid',
    '>Fornecedor</span>',
    'class="romaneio-receipt"',
    'Assinatura / nome legÃ­vel de quem recebeu',
  ];
  for (const marker of requiredTemplateMarkers) {
    if (!template.includes(marker)) throw new Error(`Frontend marker is missing: ${marker}`);
  }
  if (template.includes('>Nome legÃ­vel do recebedor</span>')) {
    throw new Error('Duplicate romaneio receipt fields remain above the footer');
  }
  for (const marker of ['async checkAppVersion', 'startVersionPolling(){', 'async bootstrapApp']) {
    if (template.split(marker).length !== 2) {
      throw new Error(`Frontend lifecycle marker must occur exactly once: ${marker}`);
    }
  }
  for (const marker of ['Esqueci minha senha', 'toggle-senha', '/api/gate/reset']) {
    if (!login.includes(marker)) throw new Error(`Login marker is missing: ${marker}`);
  }
  for (const marker of ['Definir nova senha', '/api/gate/reset/complete', 'autocomplete="new-password"']) {
    if (!resetPage.includes(marker)) throw new Error(`Reset marker is missing: ${marker}`);
  }
  if (template.includes('u.senha=senha')) {
    throw new Error('The frontend still stores new passwords in plaintext');
  }
  if (template.includes('>Fornecedor</div>')) {
    throw new Error('The romaneio still exposes company data in its header');
  }

  const scripts = Object.values(manifest).filter((resource) =>
    /javascript/.test(resource.mime));
  if (scripts.length < 4) throw new Error('Expected embedded JavaScript resources are missing');
  for (const resource of scripts) {
    const stored = Buffer.from(resource.data, 'base64');
    const decoded = resource.compressed ? zlib.gunzipSync(stored) : stored;
    if (decoded.length === 0) throw new Error('An embedded JavaScript resource is empty');
  }

  return {
    bundleBytes: Buffer.byteLength(bundle),
    templateBytes: Buffer.byteLength(template),
    resources: Object.keys(manifest).length,
  };
}

if (require.main === module) {
  const result = validateFrontend();
  process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
}

module.exports = { validateFrontend };
