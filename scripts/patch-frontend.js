'use strict';

// Applies reviewed, idempotent fixes to the generated one-file artifact.
// The original React source is not present in this repository, so the decoded
// template is patched and serialized back without touching embedded resources.
const fs = require('node:fs');
const path = require('node:path');

const bundlePath = path.resolve(__dirname, '..', 'public', 'index.html');
let bundle = fs.readFileSync(bundlePath, 'utf8');
const templatePattern = /(<script type="__bundler\/template">\s*)([\s\S]*?)(\s*<\/script>)/;
const match = bundle.match(templatePattern);
if (!match) throw new Error('Bundled template was not found');

let template = JSON.parse(match[2]);

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is ambiguous: ${label}`);
  }
  return source.replace(before, after);
}

function replaceAll(source, before, after, label) {
  if (source.includes(after) && !source.includes(before)) return source;
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replaceAll(before, after);
}

template = replaceOnce(template, '<html><head>', '<html lang="pt-BR"><head>', 'document language');
template = replaceOnce(
  template,
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>TCCON Orçamentos</title>',
  'document title',
);

const responsiveCss = `
  button,[role="button"]{touch-action:manipulation;}
  button:focus-visible,[role="button"]:focus-visible{outline:3px solid var(--accent,#2f5d86);outline-offset:2px;}
  @media (max-width:760px){
    .login-grid{grid-template-columns:minmax(0,1fr) !important;}
    .login-brand{min-height:250px;padding:30px 24px !important;}
    .login-profiles{padding:30px 18px !important;}
    .profile-grid,.responsive-grid{grid-template-columns:minmax(0,1fr) !important;}
    .new-user-fields{flex-direction:column !important;}
    .new-user-fields>button{width:100%;}
    .app-toolbar{position:static !important;flex-wrap:wrap;gap:8px !important;padding:10px 12px !important;}
    .app-nav{order:3;width:100%;overflow-x:auto;padding-bottom:2px;}
    .app-nav>button{flex:none;}
    .app-actions{order:4;width:100%;overflow-x:auto;padding-bottom:2px;}
    .app-actions>button{flex:none;}
    .app-user{margin-left:auto;}
    .app-page{padding:18px 12px 48px !important;}
    .app-page [style*="padding:22px 24px"],.app-page [style*="padding:20px 24px"]{padding:18px 16px !important;}
    [style*="grid-column:span 2"]{grid-column:auto !important;}
    .data-table{overflow-x:auto !important;-webkit-overflow-scrolling:touch;}
    .data-grid{min-width:760px;}
    .history-row{align-items:flex-start !important;flex-wrap:wrap;}
    .history-row>div[style*="flex:1"]{flex-basis:calc(100% - 60px) !important;}
    .doc-wrap{overflow-x:auto;}
  }
`;
template = replaceOnce(
  template,
  '  @media print{',
  `${responsiveCss}\n  @media print{`,
  'responsive styles',
);

template = replaceOnce(
  template,
  '<div style="flex:1;min-height:100vh;display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);">',
  '<div class="login-grid" style="flex:1;min-height:100vh;display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);">',
  'login grid',
);
template = replaceOnce(
  template,
  '<div style="position:relative;overflow:hidden;background:linear-gradient(150deg,#26241f 0%,#2f2c26 55%,#3a352d 100%);',
  '<div class="login-brand" style="position:relative;overflow:hidden;background:linear-gradient(150deg,#26241f 0%,#2f2c26 55%,#3a352d 100%);',
  'login brand',
);
template = replaceOnce(
  template,
  '<div style="background:radial-gradient(circle at 70% 15%, #f3eee5, #e6e0d5);display:flex;',
  '<div class="login-profiles" style="background:radial-gradient(circle at 70% 15%, #f3eee5, #e6e0d5);display:flex;',
  'login profiles',
);
template = replaceOnce(
  template,
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px;">',
  '<div class="profile-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px;">',
  'profile grid',
);
template = replaceOnce(
  template,
  '<div style="position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:22px 14px 18px;border:1px solid #e2dbcf;border-radius:16px;cursor:pointer;',
  '<div class="profile-card" role="button" tabindex="0" aria-label="Entrar como {{ u.nome }}" sc-camel-on-key-down="{{ u.onKey }}" style="position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:22px 14px 18px;border:1px solid #e2dbcf;border-radius:16px;cursor:pointer;',
  'keyboard-accessible profile',
);
template = replaceOnce(
  template,
  '<button sc-camel-on-click="{{ u.remove }}" style="position:absolute;',
  '<button aria-label="Remover perfil de {{ u.nome }}" sc-camel-on-click="{{ u.remove }}" style="position:absolute;',
  'profile remove label',
);
template = replaceOnce(
  template,
  '<div style="display:flex;flex-direction:column;gap:9px;">',
  '<div class="new-user-fields" style="display:flex;flex-direction:column;gap:9px;">',
  'new user fields',
);

template = replaceOnce(
  template,
  '<div style="position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:20px;padding:10px 22px;background:#211f1b;',
  '<div class="app-toolbar" style="position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:20px;padding:10px 22px;background:#211f1b;',
  'application toolbar',
);
template = replaceOnce(
  template,
  '<div style="display:flex;gap:4px;">\n        <button sc-camel-on-click="{{ goEditor }}"',
  '<div class="app-nav" role="navigation" aria-label="Seções do sistema" style="display:flex;gap:4px;">\n        <button sc-camel-on-click="{{ goEditor }}"',
  'application navigation',
);
template = replaceOnce(
  template,
  '<div style="display:flex;align-items:center;gap:9px;">',
  '<div class="app-actions" style="display:flex;align-items:center;gap:9px;">',
  'application actions',
);
template = replaceOnce(
  template,
  '<div style="display:flex;align-items:center;gap:8px;padding-left:6px;border-left:1px solid #413d36;">',
  '<div class="app-user" style="display:flex;align-items:center;gap:8px;padding-left:6px;border-left:1px solid #413d36;">',
  'application user area',
);
template = replaceAll(
  template,
  '<div style="flex:1;padding:28px 24px 64px;">',
  '<div class="app-page" style="flex:1;padding:28px 24px 64px;">',
  'application page spacing',
);
template = replaceOnce(
  template,
  '<div style="background:#fff;border:1px solid #ddd7cd;border-radius:12px;padding:22px 24px;display:grid;grid-template-columns:1.3fr 1fr;gap:28px;">',
  '<div class="responsive-grid" style="background:#fff;border:1px solid #ddd7cd;border-radius:12px;padding:22px 24px;display:grid;grid-template-columns:1.3fr 1fr;gap:28px;">',
  'budget heading grid',
);

template = replaceAll(
  template,
  '<div style="display:grid;grid-template-columns:',
  '<div class="responsive-grid" style="display:grid;grid-template-columns:',
  'responsive grids',
);
template = template.replaceAll(
  'class="responsive-grid" style="display:grid;grid-template-columns:44px 1fr 92px 130px 96px 130px 40px;',
  'class="data-grid" style="display:grid;grid-template-columns:44px 1fr 92px 130px 96px 130px 40px;',
);
template = template.replaceAll(
  'class="responsive-grid" style="display:grid;grid-template-columns:60px 1fr 130px 120px 140px 130px 44px;',
  'class="data-grid" style="display:grid;grid-template-columns:60px 1fr 130px 120px 140px 130px 44px;',
);
template = template.replaceAll(
  'class="responsive-grid" style="display:grid;grid-template-columns:1.7fr 1fr 1fr 210px;',
  'class="data-grid" style="display:grid;grid-template-columns:1.7fr 1fr 1fr 210px;',
);
template = replaceAll(
  template,
  '<div style="border:1px solid #ebe6dd;border-radius:9px;overflow:hidden;">',
  '<div class="data-table" style="border:1px solid #ebe6dd;border-radius:9px;overflow:hidden;">',
  'item and material data tables',
);
template = replaceAll(
  template,
  '<div style="background:#fff;border:1px solid #ddd7cd;border-radius:12px;overflow:hidden;">',
  '<div class="data-table" style="background:#fff;border:1px solid #ddd7cd;border-radius:12px;overflow:hidden;">',
  'material and client data tables',
);
template = replaceOnce(
  template,
  '<div style="background:#fff;border:1px solid #ddd7cd;border-radius:11px;padding:16px 20px;display:flex;align-items:center;gap:16px;">',
  '<div class="history-row" style="background:#fff;border:1px solid #ddd7cd;border-radius:11px;padding:16px 20px;display:flex;align-items:center;gap:16px;">',
  'history row',
);

template = replaceOnce(
  template,
  '<div sc-camel-on-click="{{ r.add }}" style="display:flex;',
  '<div role="button" tabindex="0" aria-label="Adicionar {{ r.desc }}" sc-camel-on-key-down="{{ r.onKey }}" sc-camel-on-click="{{ r.add }}" style="display:flex;',
  'keyboard-accessible search result',
);
template = replaceOnce(
  template,
  '<button sc-camel-on-click="{{ row.remove }}" style="justify-self:end;',
  '<button aria-label="Remover {{ row.desc }}" sc-camel-on-click="{{ row.remove }}" style="justify-self:end;',
  'item remove label',
);
template = replaceOnce(
  template,
  '<button sc-camel-on-click="{{ c.del }}" style="width:30px;',
  '<button aria-label="Excluir cliente {{ c.nome }}" sc-camel-on-click="{{ c.del }}" style="width:30px;',
  'client remove label',
);
template = replaceOnce(
  template,
  '<div data-noprint="" style="position:fixed;bottom:24px;',
  '<div role="status" aria-live="polite" data-noprint="" style="position:fixed;bottom:24px;',
  'toast live region',
);

if (!template.includes('{{ meHeaderFotoImg }}')) {
  template = replaceOnce(
    template,
    '<div style="width:30px;height:30px;border-radius:50%;background:var(--accent,#2f5d86);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;font-family:\'Barlow Semi Condensed\';">{{ meInitials }}</div>',
    '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;font-family:\'Barlow Semi Condensed\';">{{ meHeaderFotoImg }}<sc-if value="{{ meNoFoto }}" hint-placeholder-val="{{ true }}"><span>{{ meInitials }}</span></sc-if></div>',
    'adjusted photo in toolbar',
  );
}

template = replaceOnce(
  template,
  `            <span style="font-size:11.5px;color:#a29a8d;">A foto aparece na tela inicial de seleção de perfil.</span>
          </div>
        </div>
        <div class="responsive-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">`,
  `            <span style="font-size:11.5px;color:#a29a8d;">A foto aparece nos ícones do perfil e na barra superior.</span>
          </div>
        </div>
        <sc-if value="{{ meHasFoto }}" hint-placeholder-val="{{ false }}">
          <div style="margin:-4px 0 18px;padding:14px 16px;border:1px solid #ebe6dd;border-radius:10px;background:#fbfaf7;">
            <div style="font-size:12px;font-weight:700;color:#5f584f;margin-bottom:12px;">Ajustar foto no ícone</div>
            <div class="responsive-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
              <label style="display:block;"><span style="font-size:11px;font-weight:600;color:#8a8377;">Zoom</span><input type="range" min="1" max="2.5" step="0.05" value="{{ meFotoZoom }}" sc-camel-on-input="{{ onMeFotoZoom }}" style="width:100%;margin-top:7px;"></label>
              <label style="display:block;"><span style="font-size:11px;font-weight:600;color:#8a8377;">Horizontal</span><input type="range" min="0" max="100" step="1" value="{{ meFotoX }}" sc-camel-on-input="{{ onMeFotoX }}" style="width:100%;margin-top:7px;"></label>
              <label style="display:block;"><span style="font-size:11px;font-weight:600;color:#8a8377;">Vertical</span><input type="range" min="0" max="100" step="1" value="{{ meFotoY }}" sc-camel-on-input="{{ onMeFotoY }}" style="width:100%;margin-top:7px;"></label>
            </div>
            <button sc-camel-on-click="{{ onMeFotoReset }}" style="margin-top:10px;padding:0;border:none;background:transparent;color:var(--accent,#2f5d86);font-size:12px;font-weight:600;cursor:pointer;text-decoration:underline;">Centralizar foto</button>
          </div>
        </sc-if>
        <div class="responsive-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">`,
  'photo adjustment controls',
);

template = replaceOnce(
  template,
  `  setPhoto(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const s=Math.min(img.width,img.height),c=document.createElement('canvas');c.width=c.height=220;const ctx=c.getContext('2d');ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,220,220);this.setUser(u=>({...u,foto:c.toDataURL('image/jpeg',0.82)})); }; img.src=reader.result; };
    reader.readAsDataURL(file);
  }`,
  `  setPhoto(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ const img=new Image(); img.onload=()=>{
      const scale=Math.min(1,900/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);
      this.setUser(u=>({...u,foto:c.toDataURL('image/jpeg',0.84),fotoZoom:1,fotoX:50,fotoY:50}));
    }; img.src=reader.result; };
    reader.readAsDataURL(file);
  }`,
  'preserve photo for avatar adjustment',
);

if (!template.includes('const avatarStyle=user=>')) {
  template = replaceOnce(
    template,
    `    const empresa=me.empresa||this.EMPRESA_PADRAO();

    const dpct=`,
    `    const empresa=me.empresa||this.EMPRESA_PADRAO();
    const avatarStyle=user=>{
      const numberOr=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
      const x=Math.max(0,Math.min(100,numberOr(user.fotoX,50)));
      const y=Math.max(0,Math.min(100,numberOr(user.fotoY,50)));
      const zoom=Math.max(1,Math.min(2.5,numberOr(user.fotoZoom,1)));
      return {width:'100%',height:'100%',objectFit:'cover',objectPosition:x+'% '+y+'%',transform:'scale('+zoom+')',transformOrigin:x+'% '+y+'%'};
    };

    const dpct=`,
    'avatar adjustment style',
  );
}

template = replaceOnce(
  template,
  `avatar:u.foto?React.createElement('img',{src:u.foto,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}}):null`,
  `avatar:u.foto?React.createElement('img',{src:u.foto,alt:'',style:avatarStyle(u)}):null`,
  'adjust profile selection photo',
);

template = replaceOnce(
  template,
  `      meFoto:me.foto||'', meHasFoto:!!me.foto, meNoFoto:!me.foto,
      meFotoImg:me.foto?React.createElement('img',{src:me.foto,alt:'',style:{width:'100%',height:'100%',objectFit:'cover'}}):null,
      onMeFoto:e=>this.setPhoto(e.target.files&&e.target.files[0]),
      onMeFotoRemove:()=>this.setUser(u=>({...u,foto:''})),`,
  `      meFoto:me.foto||'', meHasFoto:!!me.foto, meNoFoto:!me.foto,
      meFotoImg:me.foto?React.createElement('img',{src:me.foto,alt:'',style:avatarStyle(me)}):null,
      meHeaderFotoImg:me.foto?React.createElement('img',{src:me.foto,alt:'',style:avatarStyle(me)}):null,
      meFotoZoom:me.fotoZoom||1, meFotoX:me.fotoX??50, meFotoY:me.fotoY??50,
      onMeFoto:e=>this.setPhoto(e.target.files&&e.target.files[0]),
      onMeFotoZoom:e=>this.setUser(u=>({...u,fotoZoom:Number(e.target.value)})),
      onMeFotoX:e=>this.setUser(u=>({...u,fotoX:Number(e.target.value)})),
      onMeFotoY:e=>this.setUser(u=>({...u,fotoY:Number(e.target.value)})),
      onMeFotoReset:()=>this.setUser(u=>({...u,fotoZoom:1,fotoX:50,fotoY:50})),
      onMeFotoRemove:()=>this.setUser(u=>({...u,foto:'',fotoZoom:1,fotoX:50,fotoY:50})),`,
  'photo adjustment bindings',
);

if (!template.includes('width:96px;height:96px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};')) {
  template = replaceOnce(
    template,
    'width:60px;height:60px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};',
    'width:76px;height:76px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};',
    'larger profile selection photo',
  );
}

if (!template.includes('width:48px;height:48px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);')) {
  template = replaceOnce(
    template,
    'width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);',
    'width:38px;height:38px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);',
    'larger toolbar photo',
  );
}

if (!template.includes('width:128px;height:128px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);')) {
  template = replaceOnce(
    template,
    'width:72px;height:72px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);',
    'width:96px;height:96px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);',
    'larger profile photo preview',
  );
}

template = replaceOnce(
  template,
  'width:76px;height:76px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};',
  'width:96px;height:96px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};',
  'extra-large profile selection photo',
);

template = replaceOnce(
  template,
  'width:38px;height:38px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);',
  'width:48px;height:48px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);',
  'extra-large toolbar photo',
);

template = replaceOnce(
  template,
  'width:96px;height:96px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);',
  'width:128px;height:128px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);',
  'extra-large profile photo preview',
);

if (!template.includes('clearInterval(this._versionTimer);')) {
  template = replaceOnce(
    template,
    `  componentWillUnmount(){
    if(this._events)this._events.close();
    Object.values(this._remoteTimers||{}).forEach(clearTimeout);
    clearTimeout(this._t);
  }`,
    `  componentWillUnmount(){
    if(this._events)this._events.close();
    Object.values(this._remoteTimers||{}).forEach(clearTimeout);
    clearInterval(this._versionTimer);
    if(this._onWindowFocus)window.removeEventListener('focus',this._onWindowFocus);
    clearTimeout(this._t);
  }`,
    'automatic update cleanup',
  );
}

if (!template.includes(`events.addEventListener('ready',e=>{`)) {
  template = replaceOnce(
    template,
    `    events.addEventListener('ready',()=>this.pullFromServer().then(()=>this.refreshVisibleData()));
    events.addEventListener('change',e=>{try{const change=JSON.parse(e.data);if(change&&change.key)this.refreshKey(change.key);}catch(err){}});`,
    `    events.addEventListener('ready',e=>{
      try{
        const ready=JSON.parse(e.data);
        if(ready&&ready.version&&this._appVersion&&ready.version!==this._appVersion){window.location.reload();return;}
        if(ready&&ready.version)this._appVersion=ready.version;
      }catch(err){}
      this.pullFromServer().then(()=>this.refreshVisibleData());
    });
    events.addEventListener('change',e=>{try{const change=JSON.parse(e.data);if(change&&change.key)this.refreshKey(change.key);}catch(err){}});`,
    'version-aware realtime connection',
  );
}

template = replaceOnce(
  template,
  '<div style="display:flex;justify-content:space-between;align-items:baseline;background:#fff;border:1px solid #dbe4ec;border-radius:8px;padding:8px 11px;margin-top:4px;"><span style="color:#4a463f;font-weight:600;">Margem s/ custo</span><span style="font-family:\'IBM Plex Mono\';font-weight:700;font-size:17px;color:var(--accent,#2f5d86);">{{ margemProdStr }}</span></div>',
  '<div style="display:flex;justify-content:space-between;align-items:baseline;background:#fff;border:1px solid #dbe4ec;border-radius:8px;padding:10px 12px;margin-top:4px;"><span style="color:#4a463f;font-weight:700;">Lucro sobre a venda</span><span style="font-family:\'IBM Plex Mono\';font-weight:700;font-size:20px;color:var(--accent,#2f5d86);">{{ margemVendaStr }}</span></div>',
  'highlight profit over sale',
);

template = replaceOnce(
  template,
  '<div style="display:flex;justify-content:space-between;"><span style="color:#8a8377;font-size:11.5px;">Lucro sobre a venda</span><span style="font-family:\'IBM Plex Mono\';font-size:11.5px;color:#8a8377;">{{ margemVendaStr }}</span></div>',
  '<div style="display:flex;justify-content:space-between;"><span style="color:#8a8377;font-size:11px;">Margem s/ custo</span><span style="font-family:\'IBM Plex Mono\';font-size:11px;color:#8a8377;">{{ margemProdStr }}</span></div>',
  'deemphasize margin over cost',
);

template = replaceOnce(
  template,
  '<span style="display:inline-flex;align-items:center;gap:4px;"><input value="{{ desconto }}" sc-camel-on-input="{{ onDesconto }}" inputmode="decimal" placeholder="0" style="width:56px;text-align:right;padding:5px 7px;border:1px solid #413d36;border-radius:6px;font-size:13px;font-family:\'IBM Plex Mono\';background:#2c2924;color:#f3efe8;"><span style="color:#b3ada2;">%</span></span>',
  '<span style="display:inline-flex;align-items:center;gap:4px;"><input value="{{ desconto }}" sc-camel-on-input="{{ onDesconto }}" inputmode="text" placeholder="0 ou 10%" title="Use % para percentual; sem % o valor será em reais" style="width:92px;text-align:right;padding:5px 7px;border:1px solid #413d36;border-radius:6px;font-size:13px;font-family:\'IBM Plex Mono\';background:#2c2924;color:#f3efe8;"></span>',
  'hybrid discount input',
);

template = replaceAll(
  template,
  '{{ descontoPctStr }}',
  '{{ descontoModoStr }}',
  'discount mode labels',
);

template = replaceOnce(
  template,
  `  computeTotals(){
    const s=this.state;
    const subtotal=s.itens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);
    const dpct=Math.max(0,Math.min(100,this.num(s.desconto)));
    const descontoRs=subtotal*dpct/100;
    const liquido=subtotal-descontoRs;
    const tpct=Math.max(0,this.num(s.taxaCartao));
    const taxaRs=liquido*tpct/100;
    const total=liquido+taxaRs;
    return {subtotal,descontoRs,taxaRs,total};
  }`,
  `  computeTotals(){
    const s=this.state;
    const subtotal=s.itens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);
    const descontoTexto=String(s.desconto||'').trim();
    const descontoEhPercentual=descontoTexto.includes('%');
    const descontoInformado=Math.max(0,this.num(descontoTexto.replace('%','')));
    const descontoRs=Math.min(subtotal,descontoEhPercentual?subtotal*Math.min(100,descontoInformado)/100:descontoInformado);
    const liquido=subtotal-descontoRs;
    const tpct=Math.max(0,this.num(s.taxaCartao));
    const taxaRs=liquido*tpct/100;
    const total=liquido+taxaRs;
    return {subtotal,descontoRs,taxaRs,total};
  }`,
  'hybrid discount totals',
);

template = replaceOnce(
  template,
  `    const dpct=Math.max(0,Math.min(100,this.num(s.desconto)));
    const tpct=Math.max(0,this.num(s.taxaCartao));
    const rows=s.itens.map((it,i)=>{`,
  `    const subtotal=s.itens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);
    const descontoTexto=String(s.desconto||'').trim();
    const descontoEhPercentual=descontoTexto.includes('%');
    const descontoInformado=Math.max(0,this.num(descontoTexto.replace('%','')));
    const descontoRs=Math.min(subtotal,descontoEhPercentual?subtotal*Math.min(100,descontoInformado)/100:descontoInformado);
    const dpct=subtotal>0?descontoRs/subtotal*100:0;
    const tpct=Math.max(0,this.num(s.taxaCartao));
    const rows=s.itens.map((it,i)=>{`,
  'hybrid discount analysis',
);

template = replaceOnce(
  template,
  `    const subtotal=rows.reduce((a,r)=>a+r._total,0);
    const pesoTotal=rows.reduce((a,r)=>a+r._peso,0);
    const custoTotal=rows.reduce((a,r)=>a+r._custo,0);
    const subtotalBase=rows.reduce((a,r)=>a+r._baseVenda,0);
    const descontoRs=subtotal*dpct/100;
    const totalLiquido=subtotal-descontoRs;`,
  `    const pesoTotal=rows.reduce((a,r)=>a+r._peso,0);
    const quantidadeTotal=s.itens.reduce((a,it)=>a+this.num(it.qtd),0);
    const custoTotal=rows.reduce((a,r)=>a+r._custo,0);
    const subtotalBase=rows.reduce((a,r)=>a+r._baseVenda,0);
    const totalLiquido=subtotal-descontoRs;`,
  'single hybrid discount calculation',
);

template = replaceOnce(
  template,
  `      hasDescontoTotal:dpct>0, descontoPctStr:dpct.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%', descontoRsStr:'−'+this.brl(descontoRs),`,
  `      hasDescontoTotal:descontoRs>0, descontoModoStr:descontoEhPercentual?(Math.min(100,descontoInformado).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%'):'valor fixo', descontoRsStr:'−'+this.brl(descontoRs),`,
  'hybrid discount display',
);

const oldSync = `  async pullFromServer(){
    try{
      const r=await fetch(this.apiBase()+'/store',{cache:'no-store'});
      if(!r.ok) return false;
      const data=await r.json();
      if(data && data.keys){
        Object.entries(data.keys).forEach(([k,v])=>{ try{ localStorage.setItem(k, typeof v==='string'?v:JSON.stringify(v)); }catch(e){} });
        this._serverUp=true;
        return true;
      }
    }catch(e){}
    return false;
  }
  pushKey(k,val){
    if(typeof k!=='string' || k.indexOf('tccon_')!==0) return;
    try{
      fetch(this.apiBase()+'/store/'+encodeURIComponent(k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:val})}).catch(()=>{});
    }catch(e){}
  }`;
const newSync = `  pendingGet(){ try{return JSON.parse(localStorage.getItem('__tccon_pending_sync')||'{}');}catch(e){return{};} }
  pendingSet(value){ try{localStorage.setItem('__tccon_pending_sync',JSON.stringify(value));}catch(e){} }
  mergePendingUsers(remote,local){
    if(!Array.isArray(remote))return Array.isArray(local)?local:[];
    if(!Array.isArray(local))return remote;
    const localById=new Map(local.filter(u=>u&&u.id).map(u=>[u.id,u]));
    const seen=new Set();
    const merged=remote.map(u=>{seen.add(u.id);const pending=localById.get(u.id);return pending?{...u,...pending,id:u.id}:u;});
    local.forEach(u=>{if(u&&u.id&&!seen.has(u.id)){merged.push(u);seen.add(u.id);}});
    return merged;
  }
  async pullFromServer(){
    const pending=this.pendingGet();
    try{
      const r=await fetch(this.apiBase()+'/store',{cache:'no-store'});
      if(!r.ok) return false;
      const data=await r.json();
      if(data && data.keys){
        let pendingChanged=false;
        Object.entries(data.keys).forEach(([k,v])=>{
          if(k==='tccon_users'&&Object.hasOwn(pending,k)){
            let remote=v;try{if(typeof remote==='string')remote=JSON.parse(remote);}catch(e){}
            const merged=this.mergePendingUsers(remote,pending[k]);
            pending[k]=merged;pendingChanged=true;
            try{localStorage.setItem(k,JSON.stringify(merged));}catch(e){}
            return;
          }
          if(Object.hasOwn(pending,k))return;
          try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(e){}
        });
        if(pendingChanged)this.pendingSet(pending);
        this._serverUp=true;
        await this.flushPending();
        return true;
      }
    }catch(e){}
    return false;
  }
  pushKey(k,val){
    if(typeof k!=='string' || k.indexOf('tccon_')!==0) return Promise.resolve(false);
    this.pendingSet({...this.pendingGet(),[k]:val});
    return this.flushPending();
  }
  flushPending(){
    if(this._syncPromise)return this._syncPromise;
    this._syncPromise=(async()=>{
      let failed=false;
      for(const [k,val] of Object.entries(this.pendingGet())){
        try{
          const r=await fetch(this.apiBase()+'/store/'+encodeURIComponent(k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:val})});
          if(!r.ok)throw new Error('sync_failed');
          const pending=this.pendingGet();
          if(Object.hasOwn(pending,k) && JSON.stringify(pending[k])===JSON.stringify(val)){delete pending[k];this.pendingSet(pending);}
        }catch(e){failed=true;break;}
      }
      if(failed)this.flash('Alterações salvas neste aparelho; sincronização pendente.');
      if(!failed && Object.keys(this.pendingGet()).length)setTimeout(()=>this.flushPending(),0);
      return !failed;
    })().finally(()=>{this._syncPromise=null;});
    return this._syncPromise;
  }`;
if (template.includes(oldSync)) {
  template = replaceOnce(template, oldSync, newSync, 'durable synchronization queue');
} else if (!template.includes("if(!failed && Object.keys(this.pendingGet()).length)setTimeout(()=>this.flushPending(),0);")) {
  const priorSync = newSync.replace(
    "      if(!failed && Object.keys(this.pendingGet()).length)setTimeout(()=>this.flushPending(),0);\n",
    '',
  );
  template = replaceOnce(template, priorSync, newSync, 'synchronization queue race');
}

if (!template.includes('  mergePendingUsers(remote,local){')) {
  template = replaceOnce(
    template,
    `  pendingSet(value){ try{localStorage.setItem('__tccon_pending_sync',JSON.stringify(value));}catch(e){} }
  async pullFromServer(){
    const pending=this.pendingGet();
    try{
      const r=await fetch(this.apiBase()+'/store',{cache:'no-store'});
      if(!r.ok) return false;
      const data=await r.json();
      if(data && data.keys){
        Object.entries(data.keys).forEach(([k,v])=>{ if(Object.hasOwn(pending,k))return; try{ localStorage.setItem(k, typeof v==='string'?v:JSON.stringify(v)); }catch(e){} });
        this._serverUp=true;
        await this.flushPending();
        return true;
      }
    }catch(e){}
    return false;
  }`,
    `  pendingSet(value){ try{localStorage.setItem('__tccon_pending_sync',JSON.stringify(value));}catch(e){} }
  mergePendingUsers(remote,local){
    if(!Array.isArray(remote))return Array.isArray(local)?local:[];
    if(!Array.isArray(local))return remote;
    const localById=new Map(local.filter(u=>u&&u.id).map(u=>[u.id,u]));
    const seen=new Set();
    const merged=remote.map(u=>{seen.add(u.id);const pending=localById.get(u.id);return pending?{...u,...pending,id:u.id}:u;});
    local.forEach(u=>{if(u&&u.id&&!seen.has(u.id)){merged.push(u);seen.add(u.id);}});
    return merged;
  }
  async pullFromServer(){
    const pending=this.pendingGet();
    try{
      const r=await fetch(this.apiBase()+'/store',{cache:'no-store'});
      if(!r.ok) return false;
      const data=await r.json();
      if(data && data.keys){
        let pendingChanged=false;
        Object.entries(data.keys).forEach(([k,v])=>{
          if(k==='tccon_users'&&Object.hasOwn(pending,k)){
            let remote=v;try{if(typeof remote==='string')remote=JSON.parse(remote);}catch(e){}
            const merged=this.mergePendingUsers(remote,pending[k]);
            pending[k]=merged;pendingChanged=true;
            try{localStorage.setItem(k,JSON.stringify(merged));}catch(e){}
            return;
          }
          if(Object.hasOwn(pending,k))return;
          try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(e){}
        });
        if(pendingChanged)this.pendingSet(pending);
        this._serverUp=true;
        await this.flushPending();
        return true;
      }
    }catch(e){}
    return false;
  }`,
    'merge pending user profiles with server registry',
  );
}

template = replaceOnce(
  template,
  '  async apiSetPassword(userId, senha){ if(!this._serverUp) return false; try{ const r=await fetch(this.apiBase()+\'/auth/set\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({userId,senha})});',
  '  async apiSetPassword(userId, senha, senhaAtual){ if(!this._serverUp) return false; try{ const r=await fetch(this.apiBase()+\'/auth/set\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({userId,senha,senhaAtual})});',
  'password change proof',
);
template = replaceOnce(
  template,
  '      this.setState({products, clientes:savedCli||c, users, loaded:true});',
  '      this.setState({products, clientes:savedCli||c, users, loaded:true});\n      this.migrateLocalPasswords(users);',
  'password migration startup',
);
template = replaceOnce(
  template,
  '  async addUser(){',
  `  async migrateLocalPasswords(users){
    if(!this._serverUp)return;
    let changed=false,failed=false;
    const migrated=await Promise.all(users.map(async u=>{
      const local=(u.senha||'').trim();
      if(!local)return u;
      const ok=await this.apiSetPassword(u.id,local,local);
      if(!ok){failed=true;return u;}
      changed=true;return {...u,senha:'',senhaServer:true};
    }));
    if(changed){try{localStorage.setItem('tccon_users',JSON.stringify(migrated));}catch(e){} await this.pushKey('tccon_users',migrated);this.setState({users:migrated});}
    if(failed)this.flash('Há senha local antiga que não pôde ser migrada; redefina-a no servidor.');
  }

  async addUser(){`,
  'plaintext password migration',
);
template = replaceOnce(
  template,
  '      if(this._serverUp){ const ok=await this.apiSetPassword(id,senha); u.senhaServer=!!ok; if(!ok) u.senha=senha; }\n      else { u.senha=senha; }',
  '      if(this._serverUp){ const ok=await this.apiSetPassword(id,senha); u.senhaServer=!!ok; if(!ok){this.flash(\'Não foi possível proteger o perfil com senha.\');return;} }\n      else { this.flash(\'Conecte ao servidor para criar um perfil com senha.\'); return; }',
  'remove plaintext password fallback on user creation',
);
template = replaceOnce(
  template,
  '        if(p!==u.senha){ this.flash(\'Senha incorreta.\'); return; }',
  '        this.flash(\'Senha local antiga detectada. Conecte ao servidor e defina uma nova senha no perfil.\'); return;',
  'disable plaintext password authentication',
);
template = replaceOnce(
  template,
  '      if(p!==u.senha){ this.flash(\'Senha incorreta.\'); return; }',
  '      this.flash(\'Senha local antiga não autoriza a remoção. Defina uma nova senha no servidor.\'); return;',
  'disable plaintext password removal',
);
template = replaceOnce(
  template,
  '        if(this._serverUp){ const ok=await this.apiSetPassword(uid,val); this.setUser(u=>({...u,senhaServer:!!ok,senha:ok?\'\':val})); this.flash(ok?\'Senha salva no servidor.\':\'Sem servidor: senha salva localmente.\'); }\n        else { this.setUser(u=>({...u,senha:val,senhaServer:false})); this.flash(\'Senha salva neste aparelho.\'); }',
  '        if(!this._serverUp){this.flash(\'Conecte ao servidor para alterar a senha.\');this.setState({senhaEdit:\'\' });return;}\n        let atual; if(me.senhaServer){atual=prompt(\'Senha atual de \'+me.nome+\':\');if(atual===null){this.setState({senhaEdit:\'\' });return;}}\n        const ok=await this.apiSetPassword(uid,val,atual); if(ok)this.setUser(u=>({...u,senhaServer:true,senha:\'\'})); this.flash(ok?\'Senha salva no servidor.\':\'Senha atual incorreta ou servidor indisponível.\');',
  'secure profile password update',
);

template = replaceOnce(
  template,
  "searchResults=s.products.filter(p=>(p.desc||'').toLowerCase().includes(q)).slice(0,50).map(p=>({desc:p.desc,info:",
  "searchResults=s.products.filter(p=>(p.desc||'').toLowerCase().includes(q)).slice(0,50).map(p=>({desc:p.desc,onKey:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.addProduct(p);}},info:",
  'search result keyboard handler',
);
template = replaceOnce(
  template,
  'enter:()=>this.enterUser(u.id),remove:e=>this.removeUser(u.id,e)})),',
  "enter:()=>this.enterUser(u.id),onKey:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.enterUser(u.id);}},remove:e=>this.removeUser(u.id,e)})),",
  'profile keyboard handler',
);

if (!template.includes('    this.checkGate();')) {
  template = replaceOnce(
    template,
    `  componentDidMount(){
    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});
    this.pullFromServer().then(()=>this.initData());
  }`,
    `  componentDidMount(){
    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});
    this.pullFromServer().then(()=>{this.initData();this.startRealtime();});
  }
  componentWillUnmount(){
    if(this._events)this._events.close();
    Object.values(this._remoteTimers||{}).forEach(clearTimeout);
    clearTimeout(this._t);
  }`,
    'real-time lifecycle',
  );
}

template = replaceOnce(
  template,
  `  pushKey(k,val){
    if(typeof k!=='string' || k.indexOf('tccon_')!==0) return Promise.resolve(false);`,
  `  applyRemoteKey(k,val){
    try{localStorage.setItem(k,typeof val==='string'?val:JSON.stringify(val));}catch(e){}
    const patch={};
    if(k==='tccon_materiais')patch.products=val;
    else if(k==='tccon_clientes')patch.clientes=val;
    else if(k==='tccon_users')patch.users=val;
    else if(this.state.currentUserId && k===this.orcKey(this.state.currentUserId))patch.orcamentos=val;
    if(Object.keys(patch).length)this.setState(patch);
  }
  async refreshKey(k){
    if(Object.hasOwn(this.pendingGet(),k)){this.deferRemoteKey(k);return;}
    try{
      const r=await fetch(this.apiBase()+'/store/'+encodeURIComponent(k),{cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      if(Object.hasOwn(this.pendingGet(),k)){this.deferRemoteKey(k);return;}
      this.applyRemoteKey(k,data.value);
    }catch(e){}
  }
  deferRemoteKey(k){
    this._remoteTimers=this._remoteTimers||{};
    clearTimeout(this._remoteTimers[k]);
    this._remoteTimers[k]=setTimeout(()=>{delete this._remoteTimers[k];this.refreshKey(k);},300);
  }
  startRealtime(){
    if(typeof EventSource==='undefined')return;
    if(this._events)this._events.close();
    const events=new EventSource(this.apiBase()+'/events');
    this._events=events;
    events.addEventListener('ready',()=>this.pullFromServer().then(()=>this.refreshVisibleData()));
    events.addEventListener('change',e=>{try{const change=JSON.parse(e.data);if(change&&change.key)this.refreshKey(change.key);}catch(err){}});
  }
  refreshVisibleData(){
    const keys=['tccon_materiais','tccon_clientes','tccon_users'];
    if(this.state.currentUserId)keys.push(this.orcKey(this.state.currentUserId));
    keys.forEach(k=>{const value=this.lsGet(k);if(value!==null)this.applyRemoteKey(k,value);});
  }
  pushKey(k,val){
    if(typeof k!=='string' || k.indexOf('tccon_')!==0) return Promise.resolve(false);`,
  'real-time store updates',
);

const gateMarkup = `
  <!-- ============ ACESSO INICIAL AO SISTEMA ============ -->
  <sc-if value="{{ showGate }}" hint-placeholder-val="{{ false }}">
  <div class="login-grid" style="flex:1;min-height:100vh;display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);">
    <div class="login-brand" style="position:relative;overflow:hidden;background:linear-gradient(150deg,#26241f 0%,#2f2c26 55%,#3a352d 100%);color:#f3efe8;padding:56px 52px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="position:absolute;right:-90px;top:-70px;width:340px;height:340px;border-radius:50%;background:var(--accent,#2f5d86);opacity:.18;filter:blur(8px);"></div>
      <div style="position:relative;width:76px;height:76px;border-radius:18px;overflow:hidden;box-shadow:0 8px 22px rgba(0,0,0,.28);">
        <img src="07bd7d41-cb85-48e0-8a23-c759c0441836" alt="TCCON" style="width:100%;height:100%;object-fit:cover;display:block;">
      </div>
      <div style="position:relative;">
        <div style="font-family:'Barlow Semi Condensed';font-weight:700;font-size:40px;line-height:1.05;letter-spacing:.3px;">Sistema de<br>Orçamentos</div>
        <div style="font-size:15px;color:#b3ada2;margin-top:16px;max-width:340px;line-height:1.6;">Acesso seguro ao ambiente comercial TCCON.</div>
      </div>
      <div style="position:relative;font-size:11.5px;color:#7a746a;">TCCON Artefatos de Concreto</div>
    </div>
    <div class="login-profiles" style="background:radial-gradient(circle at 70% 15%, #f3eee5, #e6e0d5);display:flex;align-items:center;justify-content:center;padding:48px 44px;">
      <div style="width:100%;max-width:420px;background:#fff;border:1px solid #ded7cb;border-radius:18px;padding:34px;box-shadow:0 18px 45px rgba(40,35,28,.1);">
        <div style="font-family:'Barlow Semi Condensed';font-weight:700;font-size:27px;">Acesso ao sistema</div>
        <div style="font-size:13.5px;color:#8a8377;margin:5px 0 24px;line-height:1.5;">Informe suas credenciais para visualizar os usuários dos orçamentos.</div>
        <label for="gate-user" style="display:block;font-size:12px;font-weight:700;color:#686157;margin-bottom:6px;">USUÁRIO</label>
        <input id="gate-user" autocomplete="username" value="{{ gateUser }}" sc-camel-on-change="{{ onGateUser }}" sc-camel-on-key-down="{{ onGateKey }}" placeholder="Digite seu usuário" style="width:100%;height:44px;border:1px solid #d8d1c5;border-radius:9px;padding:0 12px;font-size:14px;background:#fff;margin-bottom:16px;">
        <label for="gate-password" style="display:block;font-size:12px;font-weight:700;color:#686157;margin-bottom:6px;">SENHA</label>
        <input id="gate-password" type="password" autocomplete="current-password" value="{{ gatePassword }}" sc-camel-on-change="{{ onGatePassword }}" sc-camel-on-key-down="{{ onGateKey }}" placeholder="Digite sua senha" style="width:100%;height:44px;border:1px solid #d8d1c5;border-radius:9px;padding:0 12px;font-size:14px;background:#fff;">
        <sc-if value="{{ hasGateError }}" hint-placeholder-val="{{ false }}">
          <div role="alert" style="margin-top:12px;padding:10px 12px;border-radius:8px;background:#f9e9e7;color:#9a3f35;font-size:13px;">{{ gateError }}</div>
        </sc-if>
        <button sc-camel-on-click="{{ loginGate }}" style="width:100%;height:46px;margin-top:20px;border:none;border-radius:9px;background:var(--accent,#2f5d86);color:#fff;font-size:14px;font-weight:700;cursor:pointer;">{{ gateButton }}</button>
      </div>
    </div>
  </div>
  </sc-if>
`;
template = replaceOnce(
  template,
  '  <!-- ============ LOGIN / SELEÇÃO DE PERFIL ============ -->',
  `${gateMarkup}\n  <!-- ============ LOGIN / SELEÇÃO DE PERFIL ============ -->`,
  'system access screen',
);

template = replaceOnce(
  template,
  `  state = {
    loaded:false, products:[], clientes:[], orcamentos:[],`,
  `  state = {
    gateChecked:false, gateAuthenticated:false, gateUser:'', gatePassword:'', gateError:'', gateBusy:false,
    loaded:false, products:[], clientes:[], orcamentos:[],`,
  'system access state',
);

if (!template.includes('    this.checkGate();')) {
  template = replaceOnce(
    template,
    `  componentDidMount(){
    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});
    this.pullFromServer().then(()=>{this.initData();this.startRealtime();});
  }`,
    `  componentDidMount(){
    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});
    this.checkGate();
  }`,
    'system access startup',
  );
}

if (!template.includes('  async checkGate(){')) {
  template = replaceOnce(
    template,
    `  apiBase(){ return (typeof window!=='undefined' && window.__TCCON_API) ? window.__TCCON_API : '/api'; }`,
    `  apiBase(){ return (typeof window!=='undefined' && window.__TCCON_API) ? window.__TCCON_API : '/api'; }
  bootstrapApp(){ this.pullFromServer().then(()=>{this.initData();this.startRealtime();}); }
  async checkGate(){
    try{
      const r=await fetch(this.apiBase()+'/gate/session',{cache:'no-store'});
      const data=await r.json();
      if(data&&data.authenticated){this.setState({gateChecked:true,gateAuthenticated:true});this.bootstrapApp();return;}
    }catch(e){}
    this.setState({gateChecked:true,gateAuthenticated:false,loaded:true});
  }
  async loginGate(){
    if(this.state.gateBusy)return;
    const usuario=this.state.gateUser.trim(),senha=this.state.gatePassword;
    if(!usuario||!senha){this.setState({gateError:'Informe o usuário e a senha.'});return;}
    this.setState({gateBusy:true,gateError:''});
    try{
      const r=await fetch(this.apiBase()+'/gate/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario,senha})});
      if(!r.ok){this.setState({gateBusy:false,gatePassword:'',gateError:r.status===429?'Muitas tentativas. Aguarde alguns minutos.':'Usuário ou senha incorretos.'});return;}
      this.setState({gateBusy:false,gatePassword:'',gateAuthenticated:true,loaded:false});
      this.bootstrapApp();
    }catch(e){this.setState({gateBusy:false,gateError:'Não foi possível conectar ao servidor.'});}
  }`,
    'system access behavior',
  );
}

template = replaceOnce(
  template,
  `      loaded:s.loaded,
      isLogin:!s.currentUserId, isApp:!!s.currentUserId&&s.view!=='print', isPrint:s.view==='print',`,
  `      loaded:s.loaded,
      showGate:s.gateChecked&&!s.gateAuthenticated,
      gateUser:s.gateUser, gatePassword:s.gatePassword, gateError:s.gateError, hasGateError:s.gateError!=='',
      gateButton:s.gateBusy?'Entrando...':'Entrar', loginGate:()=>this.loginGate(),
      onGateUser:e=>this.setState({gateUser:e.target.value,gateError:''}),
      onGatePassword:e=>this.setState({gatePassword:e.target.value,gateError:''}),
      onGateKey:e=>{if(e.key==='Enter'){e.preventDefault();this.loginGate();}},
      isLogin:s.gateAuthenticated&&!s.currentUserId, isApp:s.gateAuthenticated&&!!s.currentUserId&&s.view!=='print', isPrint:s.gateAuthenticated&&s.view==='print',`,
  'system access render values',
);

if (!template.includes('componentDidUpdate(prevProps,prevState)')) {
  template = replaceOnce(
    template,
    `  componentDidMount(){
    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});
    this.checkGate();
  }
  componentWillUnmount(){
    if(this._events)this._events.close();
    Object.values(this._remoteTimers||{}).forEach(clearTimeout);
    clearInterval(this._versionTimer);
    if(this._onWindowFocus)window.removeEventListener('focus',this._onWindowFocus);
    clearTimeout(this._t);
  }`,
    `  componentDidMount(){
    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});
    this._onBeforeUnload=()=>this.saveDraftNow();
    window.addEventListener('beforeunload',this._onBeforeUnload);
    this.checkGate();
  }
  componentDidUpdate(prevProps,prevState){
    if(!this.state.currentUserId)return;
    if(JSON.stringify(this.draftSnapshot(prevState))===JSON.stringify(this.draftSnapshot(this.state)))return;
    clearTimeout(this._draftTimer);
    this._draftTimer=setTimeout(()=>this.saveDraftNow(),350);
  }
  componentWillUnmount(){
    this.saveDraftNow();
    clearTimeout(this._draftTimer);
    if(this._onBeforeUnload)window.removeEventListener('beforeunload',this._onBeforeUnload);
    if(this._events)this._events.close();
    Object.values(this._remoteTimers||{}).forEach(clearTimeout);
    clearInterval(this._versionTimer);
    if(this._onWindowFocus)window.removeEventListener('focus',this._onWindowFocus);
    clearTimeout(this._t);
  }`,
    'automatic draft lifecycle',
  );
}

const syncSectionStart = template.indexOf('  apiBase(){');
const pendingSectionStart = template.indexOf('  pendingGet(){', syncSectionStart);
if (syncSectionStart < 0 || pendingSectionStart < 0) {
  throw new Error('Synchronization section was not found');
}
const canonicalSyncStartup = `  apiBase(){ return (typeof window!=='undefined' && window.__TCCON_API) ? window.__TCCON_API : '/api'; }
  async checkGate(){
    try{
      const r=await fetch(this.apiBase()+'/gate/session',{cache:'no-store'});
      const data=await r.json();
      if(data&&data.authenticated){this.setState({gateChecked:true,gateAuthenticated:true});this.bootstrapApp();return;}
    }catch(e){}
    this.setState({gateChecked:true,gateAuthenticated:false,loaded:true});
  }
  async loginGate(){
    if(this.state.gateBusy)return;
    const usuario=this.state.gateUser.trim(),senha=this.state.gatePassword;
    if(!usuario||!senha){this.setState({gateError:'Informe o usu\u00e1rio e a senha.'});return;}
    this.setState({gateBusy:true,gateError:''});
    try{
      const r=await fetch(this.apiBase()+'/gate/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario,senha})});
      if(!r.ok){this.setState({gateBusy:false,gatePassword:'',gateError:r.status===429?'Muitas tentativas. Aguarde alguns minutos.':'Usu\u00e1rio ou senha incorretos.'});return;}
      this.setState({gateBusy:false,gatePassword:'',gateAuthenticated:true,loaded:false});
      this.bootstrapApp();
    }catch(e){this.setState({gateBusy:false,gateError:'N\u00e3o foi poss\u00edvel conectar ao servidor.'});}
  }
  async checkAppVersion(reloadOnChange=true){
    try{
      const r=await fetch(this.apiBase()+'/version',{cache:'no-store'});
      if(!r.ok)return false;
      const data=await r.json(),next=data&&data.version;
      if(next&&this._appVersion&&next!==this._appVersion&&reloadOnChange){this.reloadForUpdate();return true;}
      if(next)this._appVersion=next;
    }catch(e){}
    return false;
  }
  async reloadForUpdate(){
    if(this._reloading)return;
    this._reloading=true;
    await this.saveDraftNow();
    for(let i=0;i<3&&Object.keys(this.pendingGet()).length;i++)await this.flushPending();
    window.location.reload();
  }
  startVersionPolling(){
    clearInterval(this._versionTimer);
    this._versionTimer=setInterval(()=>this.checkAppVersion(true),15000);
    this._onWindowFocus=()=>{this.checkAppVersion(true);this.pullFromServer().then(()=>this.refreshVisibleData());};
    window.addEventListener('focus',this._onWindowFocus);
  }
  async bootstrapApp(){
    await this.checkAppVersion(false);
    await this.pullFromServer();
    this.initData();
    this.startRealtime();
    this.startVersionPolling();
  }
`;
template =
  template.slice(0, syncSectionStart) +
  canonicalSyncStartup +
  template.slice(pendingSectionStart);
template = template.replaceAll(
  `ready.version!==this._appVersion){window.location.reload();return;}`,
  `ready.version!==this._appVersion){this.reloadForUpdate();return;}`,
);

template = replaceOnce(
  template,
  `  curUser(){ return this.state.users.find(u=>u.id===this.state.currentUserId)||null; }
  orcKey(id){ return 'tccon_orcamentos_'+id; }`,
  `  curUser(){ return this.state.users.find(u=>u.id===this.state.currentUserId)||null; }
  orcKey(id){ return 'tccon_orcamentos_'+id; }
  draftKey(id){ return 'tccon_rascunho_'+id; }
  draftSnapshot(s){
    return {
      editingId:s.editingId,numero:s.numero,data:s.data,validade:s.validade,
      cliente:s.cliente,itens:s.itens,markup:s.markup,desconto:s.desconto,
      imposto:s.imposto,comissao:s.comissao,aplicaComissao:s.aplicaComissao,
      freteCusto:s.freteCusto,taxaCartao:s.taxaCartao,margemAlvo:s.margemAlvo,
      lucroInicial:s.lucroInicial,pagamento:s.pagamento,obs:s.obs,
      showMargem:s.showMargem,printMargem:s.printMargem
    };
  }
  draftPatch(value){
    if(!value||typeof value!=='object')return {};
    const allowed=Object.keys(this.draftSnapshot(this.state)),patch={};
    allowed.forEach(k=>{if(Object.hasOwn(value,k))patch[k]=value[k];});
    return patch;
  }
  saveDraftNow(){
    clearTimeout(this._draftTimer);
    const id=this.state.currentUserId;
    if(!id)return Promise.resolve(true);
    const draft={...this.draftSnapshot(this.state),updatedAt:Date.now()};
    try{localStorage.setItem(this.draftKey(id),JSON.stringify(draft));}catch(e){}
    return this.pushKey(this.draftKey(id),draft);
  }`,
  'persistent quote drafts',
);

if (!template.includes('const draft=this.draftPatch(this.lsGet(this.draftKey(id)))')) {
  template = replaceOnce(
    template,
    `    const orcamentos=this.lsGet(this.orcKey(id))||[];
    this.setState({currentUserId:id, orcamentos, view:'editor', editingId:null});`,
    `    const orcamentos=this.lsGet(this.orcKey(id))||[];
    const draft=this.draftPatch(this.lsGet(this.draftKey(id)));
    this.setState({...draft,currentUserId:id,orcamentos,view:'editor'});`,
    'restore persistent quote draft',
  );
}

template = replaceOnce(
  template,
  `  logout(){ this.setState({currentUserId:null, view:'editor'}); }`,
  `  logout(){ this.saveDraftNow(); this.setState({currentUserId:null, view:'editor'}); }`,
  'save draft before profile logout',
);

if (!template.includes('sc-camel-on-click="{{ salvarPdf }}"')) {
  template = replaceOnce(
    template,
    `<button sc-camel-on-click="{{ imprimir }}" style="padding:8px 18px;border:none;border-radius:7px;background:var(--accent,#2f5d86);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Imprimir / Salvar PDF</button>`,
    `<div style="display:flex;align-items:center;gap:8px;">
            <button sc-camel-on-click="{{ imprimir }}" style="padding:8px 18px;border:1px solid #5a554d;border-radius:7px;background:#fff;color:#2c2924;font-size:13px;font-weight:600;cursor:pointer;">Imprimir</button>
            <button sc-camel-on-click="{{ salvarPdf }}" style="padding:8px 18px;border:none;border-radius:7px;background:var(--accent,#2f5d86);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Salvar em PDF</button>
          </div>`,
    'separate print and PDF buttons',
  );
}

template = replaceOnce(
  template,
  `<div style="display:flex;align-items:center;gap:8px;">
          <button sc-camel-on-click="{{ imprimir }}" style="padding:8px 18px;border:1px solid #5a554d;border-radius:7px;background:#fff;color:#2c2924;font-size:13px;font-weight:600;cursor:pointer;">Imprimir</button>
          <button sc-camel-on-click="{{ salvarPdf }}" style="padding:8px 18px;border:none;border-radius:7px;background:var(--accent,#2f5d86);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Salvar em PDF</button>
        </div>`,
  `<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;">
          <button sc-camel-on-click="{{ imprimir }}" style="padding:8px 18px;border:1px solid #5a554d;border-radius:7px;background:#fff;color:#2c2924;font-size:13px;font-weight:600;cursor:pointer;">Imprimir</button>
          <button sc-camel-on-click="{{ salvarPdf }}" style="padding:8px 18px;border:none;border-radius:7px;background:var(--accent,#2f5d86);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Salvar em PDF</button>
          <button title="O PDF deve ser anexado manualmente" sc-camel-on-click="{{ enviarEmail }}" style="padding:8px 18px;border:1px solid var(--accent,#2f5d86);border-radius:7px;background:#fff;color:var(--accent,#2f5d86);font-size:13px;font-weight:600;cursor:pointer;">Enviar por e-mail</button>
        </div>`,
  'quote email button',
);

if (!template.includes('  savePdf(){')) {
  template = replaceOnce(
    template,
    `  saveQuote(){
    const s=this.state;`,
    `  savePdf(){
    const oldTitle=document.title;
    const limpar=valor=>String(valor||'').replace(/[<>:"/\\\\|?*\\u0000-\\u001F]/g,' ').replace(/\\s+/g,' ').trim();
    const numero=limpar(this.state.numero)||'sem número';
    const cliente=limpar(this.state.cliente&&this.state.cliente.nome);
    const restore=()=>{document.title=oldTitle;window.removeEventListener('afterprint',restore);};
    document.title=cliente?(cliente+' - orçamento '+numero):('Orçamento '+numero);
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),0);
    setTimeout(restore,60000);
  }
  saveQuote(){
    const s=this.state;`,
    'PDF filename from quote and client',
  );
}

const oldQuotePdfTitle = `  savePdf(){
    const oldTitle=document.title;
    const numero=String(this.state.numero||'orcamento').trim().replace(/[^a-zA-Z0-9_-]+/g,'-');
    const restore=()=>{document.title=oldTitle;window.removeEventListener('afterprint',restore);};
    document.title='Orcamento-'+numero;
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),0);
    setTimeout(restore,60000);
  }`;
const clientQuotePdfTitle = `  savePdf(){
    const oldTitle=document.title;
    const limpar=valor=>String(valor||'').replace(/[<>:"/\\\\|?*\\u0000-\\u001F]/g,' ').replace(/\\s+/g,' ').trim();
    const numero=limpar(this.state.numero)||'sem número';
    const cliente=limpar(this.state.cliente&&this.state.cliente.nome);
    const restore=()=>{document.title=oldTitle;window.removeEventListener('afterprint',restore);};
    document.title=cliente?(cliente+' - orçamento '+numero):('Orçamento '+numero);
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),0);
    setTimeout(restore,60000);
  }`;
if (template.includes(oldQuotePdfTitle)) {
  template = replaceOnce(
    template,
    oldQuotePdfTitle,
    clientQuotePdfTitle,
    'include client in PDF filename',
  );
}

if (!template.includes('  sendQuoteEmail(){')) {
  template = replaceOnce(
    template,
    `  saveQuote(){
    const s=this.state;`,
    `  sendQuoteEmail(){
    const limpar=valor=>String(valor||'').replace(/[\\r\\n]+/g,' ').replace(/\\s+/g,' ').trim();
    const nome=limpar(this.state.cliente&&this.state.cliente.nome);
    const numero=limpar(this.state.numero);
    const identificacao=[nome,numero&&('N\u00ba '+numero)].filter(Boolean).join(' - ');
    const assunto='OR\u00c7AMENTO'+(identificacao?' '+identificacao:'')+' - TCCON ARTEFATOS DE CONCRETO.';
    const corpo='Prezados(as),\\n\\nCordiais sauda\u00e7\u00f5es,\\n\\nSegue o or\u00e7amento conforme solicitado!\\n\\nQualquer d\u00favida, nos contate!\\n\\nAtenciosamente,';
    window.location.href='mailto:?subject='+encodeURIComponent(assunto)+'&body='+encodeURIComponent(corpo);
  }
  saveQuote(){
    const s=this.state;`,
    'prefilled quote email',
  );
}

template = replaceOnce(
  template,
  `verImpressao:()=>this.setState({view:'print'}), voltar:()=>this.setState({view:'editor'}), imprimir:()=>window.print(),`,
  `verImpressao:()=>this.setState({view:'print'}), voltar:()=>this.setState({view:'editor'}), imprimir:()=>window.print(), salvarPdf:()=>this.savePdf(), enviarEmail:()=>this.sendQuoteEmail(),`,
  'PDF save action',
);

template = replaceOnce(
  template,
  `<button sc-camel-on-click="{{ toggleMargem }}" style="padding:8px 13px;border:1px solid #4a463f;border-radius:7px;background:transparent;color:#e7e2d9;font-size:13px;font-weight:500;cursor:pointer;">{{ margemBtn }}</button>`,
  `<button aria-label="Atualizar página" title="Atualizar página" sc-camel-on-click="{{ atualizarPagina }}" style="width:34px;height:34px;padding:7px;border:1px solid #4a463f;border-radius:7px;background:transparent;color:#e7e2d9;cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 11a8 8 0 0 0-14.5-4.7L4 8"></path>
            <path d="M4 3v5h5"></path>
            <path d="M4 13a8 8 0 0 0 14.5 4.7L20 16"></path>
            <path d="M20 21v-5h-5"></path>
          </svg>
        </button>
        <button sc-camel-on-click="{{ toggleMargem }}" style="padding:8px 13px;border:1px solid #4a463f;border-radius:7px;background:transparent;color:#e7e2d9;font-size:13px;font-weight:500;cursor:pointer;">{{ margemBtn }}</button>`,
  'quote refresh button',
);

template = replaceOnce(
  template,
  `goEditor:()=>this.setState({view:'editor'}), goMateriais:()=>this.setState({view:'materiais'}),`,
  `goEditor:()=>this.setState({view:'editor'}), atualizarPagina:()=>{this.saveDraftNow();window.location.reload();}, goMateriais:()=>this.setState({view:'materiais'}),`,
  'quote refresh action',
);

template = replaceOnce(
  template,
  `<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Itens</span><span style="font-family:'IBM Plex Mono';">{{ itemCountStr }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Peso total</span>`,
  `<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Itens</span><span style="font-family:'IBM Plex Mono';">{{ itemCountStr }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Quantidade total</span><span style="font-family:'IBM Plex Mono';font-weight:600;">{{ quantidadeTotalStr }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Peso total</span>`,
  'total material quantity summary',
);

template = replaceOnce(
  template,
  `    const pesoTotal=rows.reduce((a,r)=>a+r._peso,0);
    const custoTotal=rows.reduce((a,r)=>a+r._custo,0);`,
  `    const pesoTotal=rows.reduce((a,r)=>a+r._peso,0);
    const quantidadeTotal=s.itens.reduce((a,it)=>a+this.num(it.qtd),0);
    const custoTotal=rows.reduce((a,r)=>a+r._custo,0);`,
  'total material quantity calculation',
);

template = replaceOnce(
  template,
  `pesoStr:this.kg(pesoTotal), itemCountStr:String(rows.length),`,
  `pesoStr:this.kg(pesoTotal), itemCountStr:String(rows.length), quantidadeTotalStr:quantidadeTotal.toLocaleString('pt-BR',{maximumFractionDigits:3}),`,
  'formatted total material quantity',
);

template = replaceOnce(
  template,
  `<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Itens</span><span style="font-family:'IBM Plex Mono';">{{ itemCountStr }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Quantidade total</span><span style="font-family:'IBM Plex Mono';font-weight:600;">{{ quantidadeTotalStr }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Peso total</span><span style="font-family:'IBM Plex Mono';">{{ pesoStr }}</span></div>`,
  `<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Itens</span><span style="font-family:'IBM Plex Mono';">{{ itemCountStr }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#b3ada2;">Peso total</span><span style="font-family:'IBM Plex Mono';">{{ pesoStr }}</span></div>`,
  'move total quantity below the item table',
);

if (!template.includes('data-quantity-total="editor"')) {
  template = replaceOnce(
    template,
    `          </sc-for>
        </div>
        </sc-if>
        <sc-if value="{{ noItens }}"`,
    `          </sc-for>
          <div data-quantity-total="editor" class="data-grid" style="display:grid;grid-template-columns:44px 1fr 92px 130px 96px 130px 40px;align-items:center;padding:10px 14px;border-top:1px solid #d8d2c8;background:#faf8f4;">
            <span style="grid-column:1 / 3;text-align:right;padding-right:14px;font-size:12px;font-weight:700;color:#6b655c;text-transform:uppercase;letter-spacing:.3px;">Quantidade total</span>
            <span style="text-align:center;font-family:'IBM Plex Mono';font-size:14px;font-weight:700;color:var(--accent,#2f5d86);">{{ quantidadeTotalStr }}</span>
          </div>
        </div>
        </sc-if>
        <sc-if value="{{ noItens }}"`,
    'quantity total under the quantity column',
  );
}

template = replaceOnce(
  template,
  `<div style="width:300px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#8a8377;"><span>Peso total</span><span style="font-family:'IBM Plex Mono';">{{ pesoStr }}</span></div>`,
  `<div style="width:300px;display:flex;flex-direction:column;gap:8px;">
          <div data-quantity-total="print" style="display:flex;justify-content:space-between;font-size:12px;color:#6b655c;"><span>Quantidade total</span><span style="font-family:'IBM Plex Mono';font-weight:700;">{{ quantidadeTotalStr }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#8a8377;"><span>Peso total</span><span style="font-family:'IBM Plex Mono';">{{ pesoStr }}</span></div>`,
  'quantity total in printed quote',
);

template = replaceOnce(
  template,
  `<div data-quantity-total="editor" class="data-grid" style="display:grid;grid-template-columns:44px 1fr 92px 130px 96px 130px 40px;align-items:center;padding:10px 14px;border-top:1px solid #d8d2c8;background:#faf8f4;">
            <span style="grid-column:1 / 3;text-align:right;padding-right:14px;font-size:12px;font-weight:700;color:#6b655c;text-transform:uppercase;letter-spacing:.3px;">Quantidade total</span>
            <span style="text-align:center;font-family:'IBM Plex Mono';font-size:14px;font-weight:700;color:var(--accent,#2f5d86);">{{ quantidadeTotalStr }}</span>
          </div>`,
  `<div data-quantity-total="editor" data-quantity-position="description" class="data-grid" style="display:grid;grid-template-columns:44px 1fr 92px 130px 96px 130px 40px;align-items:center;padding:10px 14px;border-top:1px solid #d8d2c8;background:#faf8f4;">
            <span style="grid-column:2;text-align:left;font-size:12px;font-weight:700;color:#6b655c;text-transform:uppercase;letter-spacing:.3px;">Quantidade total: <strong style="font-family:'IBM Plex Mono';font-size:14px;color:var(--accent,#2f5d86);">{{ quantidadeTotalStr }}</strong></span>
          </div>`,
  'quantity total under material description',
);

if (!template.includes('data-romaneio-page="true"')) {
  template = replaceOnce(
    template,
    `  @media print{
    body{background:#fff;}
    [data-noprint]{display:none !important;}
    .doc-wrap{padding:0 !important;background:#fff !important;}
    .doc{box-shadow:none !important;margin:0 !important;width:100% !important;max-width:100% !important;}
  }`,
    `  @media print{
    body{background:#fff;}
    [data-noprint]{display:none !important;}
    .doc-wrap{padding:0 !important;background:#fff !important;}
    .doc{box-shadow:none !important;margin:0 !important;width:100% !important;max-width:100% !important;}
    body.printing-romaneio .app-toolbar,
    body.printing-romaneio .romaneio-controls,
    body.printing-romaneio .romaneio-history,
    body.printing-romaneio .romaneio-search{display:none !important;}
    body.printing-romaneio .app-page{padding:0 !important;background:#fff !important;overflow:visible !important;}
    body.printing-romaneio .romaneio-sheet{
      border:none !important;box-shadow:none !important;border-radius:0 !important;margin:0 !important;max-width:none !important;padding:14px !important;
      zoom:1;width:100% !important;font-size:11px !important;
      break-inside:avoid-page !important;page-break-inside:avoid !important;
    }
    body.printing-romaneio .romaneio-client-grid{grid-template-columns:2fr 1fr 1fr 90px !important;gap:6px !important;padding:7px !important;}
    body.printing-romaneio .romaneio-summary-grid{gap:12px !important;margin-top:8px !important;}
    body.printing-romaneio .romaneio-sheet .data-table{overflow:visible !important;}
    body.printing-romaneio .romaneio-sheet .data-grid{
      grid-template-columns:42px 44px minmax(180px,1fr) 68px 74px 68px 76px 0 !important;
      min-width:0 !important;padding:4px 6px !important;break-inside:avoid !important;page-break-inside:avoid !important;
    }
    body.printing-romaneio .romaneio-sheet .data-grid input{width:100% !important;min-width:0 !important;box-sizing:border-box !important;}
    body.printing-romaneio .romaneio-sheet input,
    body.printing-romaneio .romaneio-sheet textarea{border-color:transparent !important;background:transparent !important;padding:3px 5px !important;font-size:11px !important;}
    body.printing-romaneio .romaneio-sheet textarea{height:30px !important;min-height:30px !important;resize:none !important;}
  }`,
    'romaneio print styles',
  );

  template = replaceOnce(
    template,
    `        <button sc-camel-on-click="{{ goMateriais }}" style="{{ tabMat }}">Materiais</button>
        <button sc-camel-on-click="{{ goHistorico }}" style="{{ tabHist }}">Orçamentos</button>`,
    `        <button sc-camel-on-click="{{ goMateriais }}" style="{{ tabMat }}">Materiais</button>
        <button sc-camel-on-click="{{ goRomaneio }}" style="{{ tabRom }}">Romaneio</button>
        <button sc-camel-on-click="{{ goHistorico }}" style="{{ tabHist }}">Orçamentos</button>`,
    'romaneio navigation tab',
  );

  template = replaceOnce(
    template,
    `    showCliForm:false, cliForm:{cod:null,nome:'',fone:'',cnpj:'',endereco:'',cidade:''},
  };`,
    `    showCliForm:false, cliForm:{cod:null,nome:'',fone:'',cnpj:'',endereco:'',cidade:''},
    romaneios:[], romEditingId:null, romNumero:'', romData:'', romSearch:'', romCliSearch:'',
    romCliente:{nome:'',cnpj:'',endereco:'',bairro:'',cidade:'',cep:'',uf:'',contato:'',ref:''},
    romItens:[], romFrete:'', romDesconto:'', romObs:'', romRecebedor:'', romRecebimentoData:'',
  };`,
    'romaneio state',
  );

  template = replaceOnce(
    template,
    `    this.setState({data:this.today(), numero:this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});`,
    `    this.setState({data:this.today(), numero:this.genNumero(), romData:this.today(), romNumero:'R-'+this.genNumero(), markup:this.props.markupPadrao ?? 2, showMargem:this.props.mostrarMargem ?? false});`,
    'initial romaneio identification',
  );

  template = replaceAll(
    template,
    `    const keys=['tccon_materiais','tccon_clientes','tccon_users'];
    if(this.state.currentUserId)keys.push(this.orcKey(this.state.currentUserId));`,
    `    const keys=['tccon_materiais','tccon_clientes','tccon_users'];
    if(this.state.currentUserId)keys.push(this.orcKey(this.state.currentUserId),this.romKey(this.state.currentUserId));`,
    'romaneio realtime keys',
  );

  template = replaceAll(
    template,
    `    else if(this.state.currentUserId && k===this.orcKey(this.state.currentUserId))patch.orcamentos=val;
    if(Object.keys(patch).length)this.setState(patch);`,
    `    else if(this.state.currentUserId && k===this.orcKey(this.state.currentUserId))patch.orcamentos=val;
    else if(this.state.currentUserId && k===this.romKey(this.state.currentUserId))patch.romaneios=val;
    if(Object.keys(patch).length)this.setState(patch);`,
    'romaneio realtime update',
  );

  template = replaceOnce(
    template,
    `  orcKey(id){ return 'tccon_orcamentos_'+id; }
  draftKey(id){ return 'tccon_rascunho_'+id; }`,
    `  orcKey(id){ return 'tccon_orcamentos_'+id; }
  romKey(id){ return 'tccon_romaneios_'+id; }
  draftKey(id){ return 'tccon_rascunho_'+id; }`,
    'romaneio storage key',
  );

  template = replaceOnce(
    template,
    `    const orcamentos=this.lsGet(this.orcKey(id))||[];
    const draft=this.draftPatch(this.lsGet(this.draftKey(id)));
    this.setState({...draft,currentUserId:id,orcamentos,view:'editor'});`,
    `    const orcamentos=this.lsGet(this.orcKey(id))||[];
    const romaneios=this.lsGet(this.romKey(id))||[];
    const draft=this.draftPatch(this.lsGet(this.draftKey(id)));
    this.setState({...draft,currentUserId:id,orcamentos,romaneios,view:'editor'});`,
    'load saved romaneios',
  );

  template = replaceOnce(
    template,
    `  deleteCliente(cod){ if(!confirm('Excluir este cliente do cadastro?'))return; this.setState(s=>{const clientes=s.clientes.filter(c=>c.cod!==cod);this.lsSet('tccon_clientes',clientes);return{clientes};}); this.flash('Cliente excluído.'); }

  renderVals(){`,
    `  deleteCliente(cod){ if(!confirm('Excluir este cliente do cadastro?'))return; this.setState(s=>{const clientes=s.clientes.filter(c=>c.cod!==cod);this.lsSet('tccon_clientes',clientes);return{clientes};}); this.flash('Cliente excluído.'); }

  goRomaneio(){
    this.setState(s=>({view:'romaneio',romNumero:s.romNumero||('R-'+this.genNumero()),romData:s.romData||this.today()}));
  }
  setRomCliente(f,v){ this.setState(s=>({romCliente:{...s.romCliente,[f]:v}})); }
  useRomClient(c){
    this.setState({
      romCliente:{
        nome:c.nome||'',cnpj:c.cnpj||'',endereco:c.endereco||'',bairro:c.bairro||'',
        cidade:c.cidade||'',cep:c.cep||'',uf:c.uf||'',contato:c.fone||'',ref:''
      },
      romCliSearch:'',
    });
  }
  addRomProduct(p){
    this.setState(s=>({
      romItens:[...s.romItens,{cod:p.cod,desc:p.desc,qtd:'1',peso:this.num(p.peso),vunit:String(this.num(p.preco))}],
      romSearch:'',
    }));
  }
  setRomItem(i,f,v){ this.setState(s=>{const itens=s.romItens.slice();itens[i]={...itens[i],[f]:v};return{romItens:itens};}); }
  removeRomItem(i){ this.setState(s=>({romItens:s.romItens.filter((_,x)=>x!==i)})); }
  importCurrentQuote(){
    if(!this.state.itens.length){this.flash('O orçamento atual não possui materiais.');return;}
    this.setState(s=>({
      view:'romaneio',
      romCliente:{
        nome:s.cliente.nome||'',cnpj:s.cliente.cnpj||'',endereco:s.cliente.endereco||'',
        bairro:'',cidade:'',cep:'',uf:'',contato:s.cliente.contato||'',ref:'Orçamento '+s.numero
      },
      romItens:s.itens.map(it=>({cod:it.cod,desc:it.desc,qtd:it.qtd,peso:this.num(it.peso),vunit:String(this.num(it.vunit))})),
      romNumero:s.romNumero||('R-'+this.genNumero()),romData:this.today(),
    }));
    this.flash('Orçamento atual carregado no romaneio.');
  }
  newRomaneio(){
    this.setState({
      romEditingId:null,romNumero:'R-'+this.genNumero(),romData:this.today(),romSearch:'',romCliSearch:'',
      romCliente:{nome:'',cnpj:'',endereco:'',bairro:'',cidade:'',cep:'',uf:'',contato:'',ref:''},
      romItens:[],romFrete:'',romDesconto:'',romObs:'',romRecebedor:'',romRecebimentoData:'',
    });
  }
  saveRomaneio(){
    const s=this.state;
    if(!s.romCliente.nome.trim()){this.flash('Informe o cliente do romaneio.');return;}
    if(!s.romItens.length){this.flash('Adicione ao menos um material ao romaneio.');return;}
    const subtotal=s.romItens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);
    const desconto=Math.min(subtotal,Math.max(0,this.num(s.romDesconto)));
    const total=subtotal-desconto+Math.max(0,this.num(s.romFrete));
    const rec={
      id:s.romEditingId||('r'+Date.now()),numero:s.romNumero,data:s.romData,
      cliente:{...s.romCliente},itens:s.romItens.map(it=>({...it})),frete:s.romFrete,
      desconto:s.romDesconto,obs:s.romObs,recebedor:s.romRecebedor,
      recebimentoData:s.romRecebimentoData,total,savedAt:Date.now(),
    };
    this.setState(st=>{
      const romaneios=[rec,...st.romaneios.filter(r=>r.id!==rec.id)];
      this.lsSet(this.romKey(st.currentUserId),romaneios);
      return {romaneios,romEditingId:rec.id};
    });
    this.flash('Romaneio '+s.romNumero+' salvo.');
  }
  openRomaneio(id){
    const r=this.state.romaneios.find(x=>x.id===id);if(!r)return;
    this.setState({
      view:'romaneio',romEditingId:r.id,romNumero:r.numero,romData:r.data,
      romCliente:{...r.cliente},romItens:r.itens.map(it=>({...it})),romFrete:r.frete||'',
      romDesconto:r.desconto||'',romObs:r.obs||'',romRecebedor:r.recebedor||'',
      romRecebimentoData:r.recebimentoData||'',romSearch:'',romCliSearch:'',
    });
  }
  deleteRomaneio(id){
    if(!confirm('Excluir este romaneio salvo?'))return;
    this.setState(s=>{
      const romaneios=s.romaneios.filter(r=>r.id!==id);
      this.lsSet(this.romKey(s.currentUserId),romaneios);
      return {romaneios};
    });
    this.flash('Romaneio excluído.');
  }
  printRomaneio(){
    const oldTitle=document.title;
    const numero=String(this.state.romNumero||'romaneio').trim().replace(/[^a-zA-Z0-9_-]+/g,'-');
    const pageStyle=document.createElement('style');
    pageStyle.id='romaneio-print-page';
    pageStyle.textContent='@page{size:A4 portrait;margin:5mm;}';
    document.head.appendChild(pageStyle);
    const restore=()=>{
      document.title=oldTitle;
      document.body.classList.remove('printing-romaneio');
      if(pageStyle.parentNode)pageStyle.parentNode.removeChild(pageStyle);
      window.removeEventListener('afterprint',restore);
    };
    document.title='Romaneio-'+numero;
    document.body.classList.add('printing-romaneio');
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),80);
    setTimeout(restore,60000);
  }

  renderVals(){`,
    'romaneio actions',
  );

  template = replaceOnce(
    template,
    `    };

    const subtotal=s.itens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);`,
    `    };

    const romRows=s.romItens.map((it,i)=>{
      const qtd=this.num(it.qtd),peso=this.num(it.peso),vunit=this.num(it.vunit);
      return {
        cod:it.cod||'—',desc:it.desc||'',qtd:it.qtd,peso:it.peso,vunit:it.vunit,
        pesoUnitStr:this.kg(peso),pesoTotalStr:this.kg(qtd*peso),
        vunitStr:this.brl(vunit),totalStr:this.brl(qtd*vunit),
        onQtd:e=>this.setRomItem(i,'qtd',e.target.value),
        onDesc:e=>this.setRomItem(i,'desc',e.target.value),
        onPeso:e=>this.setRomItem(i,'peso',e.target.value),
        onVunit:e=>this.setRomItem(i,'vunit',e.target.value),
        remove:()=>this.removeRomItem(i),
      };
    });
    const romQuantidade=romRows.reduce((a,r)=>a+this.num(r.qtd),0);
    const romPesoTotal=s.romItens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.peso),0);
    const romSubtotal=s.romItens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);
    const romDescontoRs=Math.min(romSubtotal,Math.max(0,this.num(s.romDesconto)));
    const romFreteRs=Math.max(0,this.num(s.romFrete));
    const romTotal=romSubtotal-romDescontoRs+romFreteRs;
    const romQ=s.romSearch.trim().toLocaleLowerCase('pt-BR');
    const romSearchResults=romQ?s.products.filter(p=>String(p.cod).includes(romQ)||(p.desc||'').toLocaleLowerCase('pt-BR').includes(romQ)).slice(0,7).map(p=>({
      cod:p.cod,desc:p.desc,pesoStr:this.kg(p.peso),precoStr:this.brl(p.preco),
      add:()=>this.addRomProduct(p),
      onKey:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.addRomProduct(p);}},
    })):[];
    const romCliQ=s.romCliSearch.trim().toLocaleLowerCase('pt-BR');
    const romClientResults=romCliQ?s.clientes.filter(c=>(c.nome||'').toLocaleLowerCase('pt-BR').includes(romCliQ)||String(c.cnpj||'').includes(romCliQ)).slice(0,6).map(c=>({
      nome:c.nome,sub:[c.cnpj,c.cidade,c.uf].filter(Boolean).join(' · '),use:()=>this.useRomClient(c),
    })):[];
    const romHistRows=s.romaneios.slice(0,8).map(r=>({
      numero:r.numero,cliente:(r.cliente&&r.cliente.nome)||'—',data:r.data||'—',
      totalStr:this.brl(r.total),open:()=>this.openRomaneio(r.id),del:()=>this.deleteRomaneio(r.id),
    }));

    const subtotal=s.itens.reduce((a,it)=>a+this.num(it.qtd)*this.num(it.vunit),0);`,
    'romaneio calculations',
  );

  template = replaceOnce(
    template,
    `      isEditor:s.view==='editor', isMateriais:s.view==='materiais', isHistorico:s.view==='historico', isClientes:s.view==='clientes', isPerfil:s.view==='perfil',`,
    `      isEditor:s.view==='editor', isMateriais:s.view==='materiais', isRomaneio:s.view==='romaneio', isHistorico:s.view==='historico', isClientes:s.view==='clientes', isPerfil:s.view==='perfil',`,
    'romaneio view flag',
  );

  template = replaceOnce(
    template,
    `goEditor:()=>this.setState({view:'editor'}), atualizarPagina:()=>{this.saveDraftNow();window.location.reload();}, goMateriais:()=>this.setState({view:'materiais'}),`,
    `goEditor:()=>this.setState({view:'editor'}), atualizarPagina:()=>{this.saveDraftNow();window.location.reload();}, goMateriais:()=>this.setState({view:'materiais'}), goRomaneio:()=>this.goRomaneio(),`,
    'romaneio navigation action',
  );

  template = replaceOnce(
    template,
    `tabOrc:navTab(s.view==='editor'), tabMat:navTab(s.view==='materiais'), tabHist:navTab(s.view==='historico'), tabCli:navTab(s.view==='clientes'), tabPerfil:navTab(s.view==='perfil'),`,
    `tabOrc:navTab(s.view==='editor'), tabMat:navTab(s.view==='materiais'), tabRom:navTab(s.view==='romaneio'), tabHist:navTab(s.view==='historico'), tabCli:navTab(s.view==='clientes'), tabPerfil:navTab(s.view==='perfil'),`,
    'romaneio navigation style',
  );

  template = replaceOnce(
    template,
    `      matRows, matSearch:s.matSearch, onMatSearch:e=>this.setState({matSearch:e.target.value}), matCount:s.products.length, addMaterial:()=>this.addMaterial(),

      histRows,`,
    `      matRows, matSearch:s.matSearch, onMatSearch:e=>this.setState({matSearch:e.target.value}), matCount:s.products.length, addMaterial:()=>this.addMaterial(),

      romNumero:s.romNumero,romData:s.romData,romCliente:s.romCliente,romItens:romRows,
      romSearch:s.romSearch,onRomSearch:e=>this.setState({romSearch:e.target.value}),
      romSearchResults,showRomSearch:romQ.length>0,noRomSearch:romQ.length>0&&romSearchResults.length===0,
      romCliSearch:s.romCliSearch,onRomCliSearch:e=>this.setState({romCliSearch:e.target.value}),
      romClientResults,showRomClientResults:romCliQ.length>0,noRomClientResults:romCliQ.length>0&&romClientResults.length===0,
      onRomNumero:e=>this.setState({romNumero:e.target.value}),onRomData:e=>this.setState({romData:e.target.value}),
      onRomNome:e=>this.setRomCliente('nome',e.target.value),onRomCnpj:e=>this.setRomCliente('cnpj',e.target.value),
      onRomEndereco:e=>this.setRomCliente('endereco',e.target.value),onRomBairro:e=>this.setRomCliente('bairro',e.target.value),
      onRomCidade:e=>this.setRomCliente('cidade',e.target.value),onRomCep:e=>this.setRomCliente('cep',e.target.value),
      onRomUf:e=>this.setRomCliente('uf',e.target.value),onRomContato:e=>this.setRomCliente('contato',e.target.value),
      onRomRef:e=>this.setRomCliente('ref',e.target.value),romFrete:s.romFrete,onRomFrete:e=>this.setState({romFrete:e.target.value}),
      romDesconto:s.romDesconto,onRomDesconto:e=>this.setState({romDesconto:e.target.value}),
      romObs:s.romObs,onRomObs:e=>this.setState({romObs:e.target.value}),
      romRecebedor:s.romRecebedor,onRomRecebedor:e=>this.setState({romRecebedor:e.target.value}),
      romRecebimentoData:s.romRecebimentoData,onRomRecebimentoData:e=>this.setState({romRecebimentoData:e.target.value}),
      hasRomItens:romRows.length>0,noRomItens:romRows.length===0,
      romQuantidadeStr:romQuantidade.toLocaleString('pt-BR',{maximumFractionDigits:3}),
      romPesoTotalStr:this.kg(romPesoTotal),romSubtotalStr:this.brl(romSubtotal),
      romDescontoStr:this.brl(romDescontoRs),romFreteStr:this.brl(romFreteRs),romTotalStr:this.brl(romTotal),
      novoRomaneio:()=>this.newRomaneio(),salvarRomaneio:()=>this.saveRomaneio(),
      imprimirRomaneio:()=>this.printRomaneio(),importarOrcamento:()=>this.importCurrentQuote(),
      romHistRows,hasRomHistorico:romHistRows.length>0,noRomHistorico:romHistRows.length===0,

      histRows,`,
    'romaneio render bindings',
  );

  const romaneioPage = `
    <!-- ---------- ABA ROMANEIO ---------- -->
    <sc-if value="{{ isRomaneio }}" hint-placeholder-val="{{ false }}">
    <div class="app-page" data-romaneio-page="true" style="flex:1;padding:28px 24px 64px;background:#ece9e2;">
    <div style="max-width:1180px;margin:0 auto;">
      <div class="romaneio-controls" style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;">
        <div>
          <div style="font-family:'Barlow Semi Condensed';font-weight:700;font-size:24px;">Romaneio de entrega</div>
          <div style="font-size:12.5px;color:#8a8377;margin-top:2px;">Monte o pedido com os clientes e materiais já cadastrados</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button sc-camel-on-click="{{ importarOrcamento }}" style="padding:9px 13px;border:1px solid #c9c1b5;border-radius:8px;background:#fff;color:#4a463f;font-size:12.5px;font-weight:600;cursor:pointer;">Importar orçamento atual</button>
          <button sc-camel-on-click="{{ novoRomaneio }}" style="padding:9px 13px;border:1px solid #c9c1b5;border-radius:8px;background:#fff;color:#4a463f;font-size:12.5px;font-weight:600;cursor:pointer;">Novo</button>
          <button sc-camel-on-click="{{ salvarRomaneio }}" style="padding:9px 15px;border:1px solid #365f82;border-radius:8px;background:#fff;color:var(--accent,#2f5d86);font-size:12.5px;font-weight:700;cursor:pointer;">Salvar</button>
          <button sc-camel-on-click="{{ imprimirRomaneio }}" style="padding:9px 16px;border:none;border-radius:8px;background:var(--accent,#2f5d86);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;">Imprimir / PDF</button>
        </div>
      </div>

      <div class="romaneio-sheet" style="background:#fff;border:1px solid #d6d0c5;border-radius:14px;box-shadow:0 12px 36px rgba(48,43,35,.08);padding:30px;">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:20px;border-bottom:3px solid #211f1b;padding-bottom:16px;">
          <div></div>
          <div style="font-family:'Barlow Semi Condensed';font-weight:700;font-size:30px;letter-spacing:1px;text-align:center;">ROMANEIO</div>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <label style="display:block;width:140px;"><span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Número</span><input value="{{ romNumero }}" sc-camel-on-input="{{ onRomNumero }}" style="width:100%;margin-top:4px;padding:8px 9px;border:1px solid #d8d2c8;border-radius:6px;font-family:'IBM Plex Mono';font-weight:700;text-align:center;"></label>
            <label style="display:block;width:130px;"><span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Data</span><input value="{{ romData }}" sc-camel-on-input="{{ onRomData }}" style="width:100%;margin-top:4px;padding:8px 9px;border:1px solid #d8d2c8;border-radius:6px;text-align:center;"></label>
          </div>
        </div>

        <div style="margin-top:18px;border:1px solid #ddd7cd;border-radius:10px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f4f0e8;border-bottom:1px solid #ddd7cd;">
            <span style="font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#5f584f;">Entrega / cliente</span>
            <div class="romaneio-search" style="position:relative;flex:1;max-width:420px;">
              <input value="{{ romCliSearch }}" sc-camel-on-input="{{ onRomCliSearch }}" placeholder="Buscar cliente cadastrado…" style="width:100%;padding:7px 9px;border:1px solid #d5cec2;border-radius:6px;background:#fff;font-size:12.5px;">
              <sc-if value="{{ showRomClientResults }}" hint-placeholder-val="{{ false }}">
                <div style="position:absolute;z-index:15;left:0;right:0;top:36px;background:#fff;border:1px solid #d8d2c8;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.12);overflow:hidden;">
                  <sc-for list="{{ romClientResults }}" as="c" hint-placeholder-count="3">
                    <button sc-camel-on-click="{{ c.use }}" style="display:block;width:100%;padding:9px 11px;border:none;border-top:1px solid #f0ece4;background:#fff;text-align:left;cursor:pointer;"><strong style="font-size:12.5px;">{{ c.nome }}</strong><span style="display:block;font-size:11px;color:#8a8377;margin-top:2px;">{{ c.sub }}</span></button>
                  </sc-for>
                  <sc-if value="{{ noRomClientResults }}" hint-placeholder-val="{{ false }}"><div style="padding:10px;font-size:12px;color:#9a9388;">Nenhum cliente encontrado.</div></sc-if>
                </div>
              </sc-if>
            </div>
          </div>
          <div class="responsive-grid romaneio-client-grid" style="display:grid;grid-template-columns:2fr 1fr 1fr 90px;gap:10px;padding:12px;">
            <label style="grid-column:span 2;"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Nome / razão social</span><input value="{{ romCliente.nome }}" sc-camel-on-input="{{ onRomNome }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">CNPJ / CPF</span><input value="{{ romCliente.cnpj }}" sc-camel-on-input="{{ onRomCnpj }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">REF</span><input value="{{ romCliente.ref }}" sc-camel-on-input="{{ onRomRef }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label style="grid-column:span 2;"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Endereço</span><input value="{{ romCliente.endereco }}" sc-camel-on-input="{{ onRomEndereco }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Bairro</span><input value="{{ romCliente.bairro }}" sc-camel-on-input="{{ onRomBairro }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Contato</span><input value="{{ romCliente.contato }}" sc-camel-on-input="{{ onRomContato }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Cidade</span><input value="{{ romCliente.cidade }}" sc-camel-on-input="{{ onRomCidade }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">CEP</span><input value="{{ romCliente.cep }}" sc-camel-on-input="{{ onRomCep }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">UF</span><input value="{{ romCliente.uf }}" sc-camel-on-input="{{ onRomUf }}" maxlength="2" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;text-transform:uppercase;"></label>
          </div>
        </div>

        <div class="romaneio-search" style="position:relative;margin-top:18px;">
          <input value="{{ romSearch }}" sc-camel-on-input="{{ onRomSearch }}" placeholder="Adicionar material por código ou descrição…" style="width:100%;padding:10px 12px;border:1.5px solid #c9c1b5;border-radius:8px;font-size:13px;background:#fbfaf7;">
          <sc-if value="{{ showRomSearch }}" hint-placeholder-val="{{ false }}">
            <div style="position:absolute;z-index:14;left:0;right:0;top:43px;background:#fff;border:1px solid #d8d2c8;border-radius:8px;box-shadow:0 10px 28px rgba(0,0,0,.13);overflow:hidden;">
              <sc-for list="{{ romSearchResults }}" as="r" hint-placeholder-count="4">
                <div role="button" tabindex="0" sc-camel-on-click="{{ r.add }}" sc-camel-on-key-down="{{ r.onKey }}" style="display:grid;grid-template-columns:64px 1fr 110px 120px;gap:10px;padding:9px 12px;border-top:1px solid #f0ece4;cursor:pointer;align-items:center;"><span style="font-family:'IBM Plex Mono';color:#8a8377;">{{ r.cod }}</span><strong style="font-size:12.5px;">{{ r.desc }}</strong><span style="text-align:right;font-size:11.5px;color:#6b655c;">{{ r.pesoStr }}</span><span style="text-align:right;font-size:11.5px;color:var(--accent,#2f5d86);">{{ r.precoStr }}</span></div>
              </sc-for>
              <sc-if value="{{ noRomSearch }}" hint-placeholder-val="{{ false }}"><div style="padding:11px;font-size:12px;color:#9a9388;">Nenhum material encontrado.</div></sc-if>
            </div>
          </sc-if>
        </div>

        <div class="data-table" style="margin-top:10px;border:1px solid #cfc8bc;border-radius:9px;overflow-x:auto;">
          <div class="data-grid" style="display:grid;grid-template-columns:70px 82px minmax(250px,1fr) 110px 120px 118px 125px 38px;background:#211f1b;color:#fff;padding:10px 11px;font-size:10px;font-weight:700;letter-spacing:.45px;text-transform:uppercase;">
            <span>Cód.</span><span style="text-align:center;">Qtd.</span><span>Descrição</span><span style="text-align:right;">Peso unit.</span><span style="text-align:right;">Peso total</span><span style="text-align:right;">V. unit.</span><span style="text-align:right;">V. total</span><span></span>
          </div>
          <sc-if value="{{ hasRomItens }}" hint-placeholder-val="{{ true }}">
          <sc-for list="{{ romItens }}" as="r" hint-placeholder-count="5">
            <div class="data-grid" style="display:grid;grid-template-columns:70px 82px minmax(250px,1fr) 110px 120px 118px 125px 38px;align-items:center;padding:8px 11px;border-top:1px solid #eee9e0;">
              <span style="font-family:'IBM Plex Mono';font-size:12px;color:#8a8377;">{{ r.cod }}</span>
              <input value="{{ r.qtd }}" sc-camel-on-input="{{ r.onQtd }}" inputmode="decimal" style="width:66px;text-align:center;padding:6px;border:1px solid #ddd7cd;border-radius:5px;font-family:'IBM Plex Mono';">
              <input value="{{ r.desc }}" sc-camel-on-input="{{ r.onDesc }}" style="width:100%;padding:6px 7px;border:1px solid transparent;border-radius:5px;background:transparent;">
              <input value="{{ r.peso }}" sc-camel-on-input="{{ r.onPeso }}" inputmode="decimal" style="width:90px;justify-self:end;text-align:right;padding:6px;border:1px solid #ddd7cd;border-radius:5px;font-family:'IBM Plex Mono';">
              <span style="text-align:right;font-family:'IBM Plex Mono';font-size:12px;">{{ r.pesoTotalStr }}</span>
              <input value="{{ r.vunit }}" sc-camel-on-input="{{ r.onVunit }}" inputmode="decimal" style="width:100px;justify-self:end;text-align:right;padding:6px;border:1px solid #ddd7cd;border-radius:5px;font-family:'IBM Plex Mono';">
              <span style="text-align:right;font-family:'IBM Plex Mono';font-size:12px;font-weight:700;">{{ r.totalStr }}</span>
              <button data-noprint="" sc-camel-on-click="{{ r.remove }}" aria-label="Remover material" style="width:26px;height:26px;border:none;border-radius:6px;background:#f2ede5;color:#a05a5a;cursor:pointer;">×</button>
            </div>
          </sc-for>
          </sc-if>
          <sc-if value="{{ noRomItens }}" hint-placeholder-val="{{ false }}"><div style="padding:30px;text-align:center;color:#9a9388;font-size:12.5px;">Busque um material acima para iniciar o romaneio.</div></sc-if>
        </div>

        <div class="romaneio-summary-grid" style="display:grid;grid-template-columns:1fr 330px;gap:24px;margin-top:16px;align-items:start;">
          <div>
            <label style="display:block;"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Observações da entrega</span><textarea value="{{ romObs }}" sc-camel-on-input="{{ onRomObs }}" rows="4" placeholder="Horário, acesso, descarga, responsável…" style="width:100%;margin-top:5px;padding:9px 10px;border:1px solid #ddd7cd;border-radius:7px;resize:vertical;"></textarea></label>
            <div style="display:grid;grid-template-columns:1fr 150px;gap:12px;margin-top:12px;">
              <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Nome legível do recebedor</span><input value="{{ romRecebedor }}" sc-camel-on-input="{{ onRomRecebedor }}" style="width:100%;margin-top:5px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;"></label>
              <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Data recebimento</span><input value="{{ romRecebimentoData }}" sc-camel-on-input="{{ onRomRecebimentoData }}" style="width:100%;margin-top:5px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;text-align:center;"></label>
            </div>
          </div>
          <div style="background:#f4f0e8;border-radius:9px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;font-size:12px;">
            <div style="display:flex;justify-content:space-between;"><span>Quantidade total</span><strong style="font-family:'IBM Plex Mono';">{{ romQuantidadeStr }}</strong></div>
            <div style="display:flex;justify-content:space-between;"><span>Peso total</span><strong style="font-family:'IBM Plex Mono';">{{ romPesoTotalStr }}</strong></div>
            <div style="display:flex;justify-content:space-between;border-top:1px solid #d9d1c5;padding-top:8px;"><span>Subtotal</span><strong style="font-family:'IBM Plex Mono';">{{ romSubtotalStr }}</strong></div>
            <label style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><span>Desconto R$</span><input value="{{ romDesconto }}" sc-camel-on-input="{{ onRomDesconto }}" inputmode="decimal" placeholder="0,00" style="width:100px;text-align:right;padding:5px 7px;border:1px solid #d0c8bc;border-radius:5px;font-family:'IBM Plex Mono';"></label>
            <label style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><span>Frete R$</span><input value="{{ romFrete }}" sc-camel-on-input="{{ onRomFrete }}" inputmode="decimal" placeholder="0,00" style="width:100px;text-align:right;padding:5px 7px;border:1px solid #d0c8bc;border-radius:5px;font-family:'IBM Plex Mono';"></label>
            <div style="display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid #211f1b;padding-top:10px;margin-top:2px;"><span style="font-weight:800;text-transform:uppercase;">Total do pedido</span><strong style="font-family:'IBM Plex Mono';font-size:18px;color:var(--accent,#2f5d86);">{{ romTotalStr }}</strong></div>
          </div>
        </div>
      </div>

      <div class="romaneio-history" style="margin-top:22px;">
        <div style="font-family:'Barlow Semi Condensed';font-size:18px;font-weight:700;margin-bottom:10px;">Romaneios salvos</div>
        <sc-if value="{{ hasRomHistorico }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;flex-direction:column;gap:8px;">
          <sc-for list="{{ romHistRows }}" as="h" hint-placeholder-count="3">
            <div style="display:grid;grid-template-columns:130px 1fr 110px 130px auto;gap:12px;align-items:center;background:#fff;border:1px solid #ddd7cd;border-radius:9px;padding:11px 14px;">
              <strong style="font-family:'IBM Plex Mono';color:var(--accent,#2f5d86);">{{ h.numero }}</strong><span style="font-weight:600;">{{ h.cliente }}</span><span style="font-size:12px;color:#8a8377;">{{ h.data }}</span><strong style="font-family:'IBM Plex Mono';text-align:right;">{{ h.totalStr }}</strong>
              <span style="display:flex;gap:7px;"><button sc-camel-on-click="{{ h.open }}" style="padding:6px 11px;border:none;border-radius:6px;background:var(--accent,#2f5d86);color:#fff;font-size:11.5px;font-weight:600;cursor:pointer;">Abrir</button><button sc-camel-on-click="{{ h.del }}" style="padding:6px 9px;border:1px solid #ddd7cd;border-radius:6px;background:#fff;color:#a05a5a;font-size:11.5px;cursor:pointer;">Excluir</button></span>
            </div>
          </sc-for>
          </div>
        </sc-if>
        <sc-if value="{{ noRomHistorico }}" hint-placeholder-val="{{ true }}"><div style="padding:24px;border:1px dashed #cfc7ba;border-radius:9px;text-align:center;color:#91897c;font-size:12.5px;">Nenhum romaneio salvo ainda.</div></sc-if>
      </div>
    </div>
    </div>
    </sc-if>

`;
  template = replaceOnce(
    template,
    `    <!-- ---------- ABA PERFIL ---------- -->`,
    `${romaneioPage}    <!-- ---------- ABA PERFIL ---------- -->`,
    'romaneio page',
  );
}

const romaneioCompanyHeader = `          <div>
            <div style="font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:#8a8377;">Fornecedor</div>
            <div style="font-family:'Barlow Semi Condensed';font-size:17px;font-weight:700;margin-top:5px;">{{ empresa.nome }}</div>
            <div style="font-size:11.5px;color:#6b655c;line-height:1.45;margin-top:4px;white-space:pre-line;">{{ empresaLinhas }}</div>
          </div>`;
if (template.includes(romaneioCompanyHeader)) {
  template = replaceOnce(
    template,
    romaneioCompanyHeader,
    '          <div></div>',
    'blank romaneio company header',
  );
}

const oldRomaneioPrintCss = `    body.printing-romaneio .app-page{padding:0 !important;background:#fff !important;}
    body.printing-romaneio .romaneio-sheet{border:none !important;box-shadow:none !important;border-radius:0 !important;margin:0 !important;max-width:none !important;}
    body.printing-romaneio .romaneio-sheet input,
    body.printing-romaneio .romaneio-sheet textarea{border-color:transparent !important;background:transparent !important;}`;
const fittedRomaneioPrintCss = `    body.printing-romaneio .app-page{padding:0 !important;background:#fff !important;overflow:visible !important;}
    body.printing-romaneio .romaneio-sheet{
      border:none !important;box-shadow:none !important;border-radius:0 !important;margin:0 !important;max-width:none !important;
      zoom:var(--rom-print-scale,.65);width:var(--rom-print-width,153.85%) !important;
      break-inside:avoid-page !important;page-break-inside:avoid !important;
    }
    body.printing-romaneio .romaneio-sheet .data-grid{break-inside:avoid !important;page-break-inside:avoid !important;}
    body.printing-romaneio .romaneio-sheet input,
    body.printing-romaneio .romaneio-sheet textarea{border-color:transparent !important;background:transparent !important;}
    body.printing-romaneio .romaneio-sheet textarea{height:38px !important;min-height:38px !important;resize:none !important;}`;
if (template.includes(oldRomaneioPrintCss)) {
  template = replaceOnce(
    template,
    oldRomaneioPrintCss,
    fittedRomaneioPrintCss,
    'single-page romaneio print styles',
  );
}

const oldPrintRomaneioMethod = `  printRomaneio(){
    const oldTitle=document.title;
    const numero=String(this.state.romNumero||'romaneio').trim().replace(/[^a-zA-Z0-9_-]+/g,'-');
    const restore=()=>{document.title=oldTitle;document.body.classList.remove('printing-romaneio');window.removeEventListener('afterprint',restore);};
    document.title='Romaneio-'+numero;
    document.body.classList.add('printing-romaneio');
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),0);
    setTimeout(restore,60000);
  }`;
const fittedPrintRomaneioMethod = `  printRomaneio(){
    const oldTitle=document.title;
    const numero=String(this.state.romNumero||'romaneio').trim().replace(/[^a-zA-Z0-9_-]+/g,'-');
    const sheet=document.querySelector('.romaneio-sheet');
    const scale=sheet?Math.max(.38,Math.min(.82,720/Math.max(1,sheet.scrollWidth),1020/Math.max(1,sheet.scrollHeight))):.65;
    if(sheet){
      sheet.style.setProperty('--rom-print-scale',String(scale));
      sheet.style.setProperty('--rom-print-width',(100/scale)+'%');
    }
    const pageStyle=document.createElement('style');
    pageStyle.id='romaneio-print-page';
    pageStyle.textContent='@page{size:A4 portrait;margin:7mm;}';
    document.head.appendChild(pageStyle);
    const restore=()=>{
      document.title=oldTitle;
      document.body.classList.remove('printing-romaneio');
      if(sheet){sheet.style.removeProperty('--rom-print-scale');sheet.style.removeProperty('--rom-print-width');}
      if(pageStyle.parentNode)pageStyle.parentNode.removeChild(pageStyle);
      window.removeEventListener('afterprint',restore);
    };
    document.title='Romaneio-'+numero;
    document.body.classList.add('printing-romaneio');
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),80);
    setTimeout(restore,60000);
  }`;
if (template.includes(oldPrintRomaneioMethod)) {
  template = replaceOnce(
    template,
    oldPrintRomaneioMethod,
    fittedPrintRomaneioMethod,
    'single-page romaneio print scaling',
  );
}

const balancedRomaneioPrintCss = `    body.printing-romaneio .app-page{padding:0 !important;background:#fff !important;overflow:visible !important;}
    body.printing-romaneio .romaneio-sheet{
      border:none !important;box-shadow:none !important;border-radius:0 !important;margin:0 !important;max-width:none !important;padding:14px !important;
      zoom:.9;width:111.111% !important;font-size:10px !important;
      break-inside:avoid-page !important;page-break-inside:avoid !important;
    }
    body.printing-romaneio .romaneio-client-grid{grid-template-columns:2fr 1fr 1fr 90px !important;gap:6px !important;padding:7px !important;}
    body.printing-romaneio .romaneio-summary-grid{gap:12px !important;margin-top:8px !important;}
    body.printing-romaneio .romaneio-sheet .data-grid{padding:4px 8px !important;break-inside:avoid !important;page-break-inside:avoid !important;}
    body.printing-romaneio .romaneio-sheet input,
    body.printing-romaneio .romaneio-sheet textarea{border-color:transparent !important;background:transparent !important;padding:3px 5px !important;font-size:10px !important;}
    body.printing-romaneio .romaneio-sheet textarea{height:30px !important;min-height:30px !important;resize:none !important;}`;
if (template.includes(fittedRomaneioPrintCss)) {
  template = replaceOnce(
    template,
    fittedRomaneioPrintCss,
    balancedRomaneioPrintCss,
    'balanced romaneio print styles',
  );
}

const uncroppedRomaneioPrintCss = `    body.printing-romaneio .app-page{padding:0 !important;background:#fff !important;overflow:visible !important;}
    body.printing-romaneio .romaneio-sheet{
      border:none !important;box-shadow:none !important;border-radius:0 !important;margin:0 !important;max-width:none !important;padding:14px !important;
      zoom:1;width:100% !important;font-size:11px !important;
      break-inside:avoid-page !important;page-break-inside:avoid !important;
    }
    body.printing-romaneio .romaneio-client-grid{grid-template-columns:2fr 1fr 1fr 90px !important;gap:6px !important;padding:7px !important;}
    body.printing-romaneio .romaneio-summary-grid{gap:12px !important;margin-top:8px !important;}
    body.printing-romaneio .romaneio-sheet .data-table{overflow:visible !important;}
    body.printing-romaneio .romaneio-sheet .data-grid{
      grid-template-columns:42px 44px minmax(180px,1fr) 68px 74px 68px 76px 0 !important;
      min-width:0 !important;padding:4px 6px !important;break-inside:avoid !important;page-break-inside:avoid !important;
    }
    body.printing-romaneio .romaneio-sheet .data-grid input{width:100% !important;min-width:0 !important;box-sizing:border-box !important;}
    body.printing-romaneio .romaneio-sheet input,
    body.printing-romaneio .romaneio-sheet textarea{border-color:transparent !important;background:transparent !important;padding:3px 5px !important;font-size:11px !important;}
    body.printing-romaneio .romaneio-sheet textarea{height:30px !important;min-height:30px !important;resize:none !important;}`;
if (template.includes(balancedRomaneioPrintCss)) {
  template = replaceOnce(
    template,
    balancedRomaneioPrintCss,
    uncroppedRomaneioPrintCss,
    'uncropped romaneio print columns',
  );
}

const balancedPrintRomaneioMethod = `  printRomaneio(){
    const oldTitle=document.title;
    const numero=String(this.state.romNumero||'romaneio').trim().replace(/[^a-zA-Z0-9_-]+/g,'-');
    const pageStyle=document.createElement('style');
    pageStyle.id='romaneio-print-page';
    pageStyle.textContent='@page{size:A4 portrait;margin:5mm;}';
    document.head.appendChild(pageStyle);
    const restore=()=>{
      document.title=oldTitle;
      document.body.classList.remove('printing-romaneio');
      if(pageStyle.parentNode)pageStyle.parentNode.removeChild(pageStyle);
      window.removeEventListener('afterprint',restore);
    };
    document.title='Romaneio-'+numero;
    document.body.classList.add('printing-romaneio');
    window.addEventListener('afterprint',restore);
    setTimeout(()=>window.print(),80);
    setTimeout(restore,60000);
  }`;
if (template.includes(fittedPrintRomaneioMethod)) {
  template = replaceOnce(
    template,
    fittedPrintRomaneioMethod,
    balancedPrintRomaneioMethod,
    'balanced romaneio print sizing',
  );
}

template = template.replace(
  '<div class="responsive-grid" style="display:grid;grid-template-columns:2fr 1fr 1fr 90px;gap:10px;padding:12px;">',
  '<div class="responsive-grid romaneio-client-grid" style="display:grid;grid-template-columns:2fr 1fr 1fr 90px;gap:10px;padding:12px;">',
);
template = template.replace(
  '<div style="display:grid;grid-template-columns:1fr 330px;gap:24px;margin-top:16px;align-items:start;">',
  '<div class="romaneio-summary-grid" style="display:grid;grid-template-columns:1fr 330px;gap:24px;margin-top:16px;align-items:start;">',
);

if (!template.includes("romFornecedor:{nome:''")) {
  template = replaceOnce(
    template,
    `    romaneios:[], romEditingId:null, romNumero:'', romData:'', romSearch:'', romCliSearch:'',
    romCliente:{nome:'',cnpj:'',endereco:'',bairro:'',cidade:'',cep:'',uf:'',contato:'',ref:''},`,
    `    romaneios:[], romEditingId:null, romNumero:'', romData:'', romSearch:'', romCliSearch:'',
    romFornecedor:{nome:'',cnpj:'',endereco:'',telefone:''}, romShowFornecedorLogo:false,
    romCliente:{nome:'',cnpj:'',endereco:'',bairro:'',cidade:'',cep:'',uf:'',contato:'',ref:''},`,
    'romaneio supplier state',
  );

  template = replaceOnce(
    template,
    `  setRomCliente(f,v){ this.setState(s=>({romCliente:{...s.romCliente,[f]:v}})); }`,
    `  setRomFornecedor(f,v){ this.setState(s=>({romFornecedor:{...s.romFornecedor,[f]:v}})); }
  toggleTcconFornecedor(){
    if(this.state.romShowFornecedorLogo){this.setState({romShowFornecedorLogo:false});return;}
    const me=this.curUser()||{empresa:this.EMPRESA_PADRAO()};
    const empresa=me.empresa||this.EMPRESA_PADRAO();
    this.setState({
      romFornecedor:{nome:empresa.nome||'',cnpj:empresa.cnpj||'',endereco:empresa.endereco||'',telefone:empresa.telefone||''},
      romShowFornecedorLogo:true,
    });
  }
  setRomCliente(f,v){ this.setState(s=>({romCliente:{...s.romCliente,[f]:v}})); }`,
    'romaneio supplier actions',
  );

  template = replaceOnce(
    template,
    `      romEditingId:null,romNumero:'R-'+this.genNumero(),romData:this.today(),romSearch:'',romCliSearch:'',
      romCliente:{nome:'',cnpj:'',endereco:'',bairro:'',cidade:'',cep:'',uf:'',contato:'',ref:''},`,
    `      romEditingId:null,romNumero:'R-'+this.genNumero(),romData:this.today(),romSearch:'',romCliSearch:'',
      romFornecedor:{nome:'',cnpj:'',endereco:'',telefone:''},romShowFornecedorLogo:false,
      romCliente:{nome:'',cnpj:'',endereco:'',bairro:'',cidade:'',cep:'',uf:'',contato:'',ref:''},`,
    'reset romaneio supplier',
  );

  template = replaceOnce(
    template,
    `      cliente:{...s.romCliente},itens:s.romItens.map(it=>({...it})),frete:s.romFrete,`,
    `      fornecedor:{...s.romFornecedor},showFornecedorLogo:!!s.romShowFornecedorLogo,
      cliente:{...s.romCliente},itens:s.romItens.map(it=>({...it})),frete:s.romFrete,`,
    'save romaneio supplier',
  );

  template = replaceOnce(
    template,
    `      view:'romaneio',romEditingId:r.id,romNumero:r.numero,romData:r.data,
      romCliente:{...r.cliente},romItens:r.itens.map(it=>({...it})),romFrete:r.frete||'',`,
    `      view:'romaneio',romEditingId:r.id,romNumero:r.numero,romData:r.data,
      romFornecedor:{...(r.fornecedor||{nome:'',cnpj:'',endereco:'',telefone:''})},
      romShowFornecedorLogo:!!r.showFornecedorLogo,
      romCliente:{...r.cliente},romItens:r.itens.map(it=>({...it})),romFrete:r.frete||'',`,
    'open romaneio supplier',
  );

  template = replaceOnce(
    template,
    `      romNumero:s.romNumero,romData:s.romData,romCliente:s.romCliente,romItens:romRows,`,
    `      romNumero:s.romNumero,romData:s.romData,
      romFornecedor:s.romFornecedor,romShowFornecedorLogo:s.romShowFornecedorLogo,
      romHideFornecedorLogo:!s.romShowFornecedorLogo,
      romFornecedorBtn:s.romShowFornecedorLogo?'Ocultar logo TCCON':'Usar TCCON como fornecedor',
      toggleTcconFornecedor:()=>this.toggleTcconFornecedor(),
      onRomFornecedorNome:e=>this.setRomFornecedor('nome',e.target.value),
      onRomFornecedorCnpj:e=>this.setRomFornecedor('cnpj',e.target.value),
      onRomFornecedorEndereco:e=>this.setRomFornecedor('endereco',e.target.value),
      onRomFornecedorTelefone:e=>this.setRomFornecedor('telefone',e.target.value),
      romCliente:s.romCliente,romItens:romRows,`,
    'romaneio supplier bindings',
  );

  template = replaceOnce(
    template,
    `          <div></div>
          <div style="font-family:'Barlow Semi Condensed';font-weight:700;font-size:30px;letter-spacing:1px;text-align:center;">ROMANEIO</div>`,
    `          <div>
            <sc-if value="{{ romShowFornecedorLogo }}" hint-placeholder-val="{{ false }}">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:58px;height:58px;flex:none;border-radius:50%;overflow:hidden;"><image-slot id="tccon-romaneio-logo" shape="circle" placeholder="Logo TCCON" src="58e4613a-04c8-4f7e-8821-e795125bd831"></image-slot></div>
                <div>
                  <div style="font-family:'Barlow Semi Condensed';font-size:15px;font-weight:700;">{{ romFornecedor.nome }}</div>
                  <div style="font-size:10.5px;color:#6b655c;line-height:1.4;margin-top:2px;">CNPJ {{ romFornecedor.cnpj }}<br>{{ romFornecedor.endereco }}<br>{{ romFornecedor.telefone }}</div>
                </div>
              </div>
            </sc-if>
          </div>
          <div style="font-family:'Barlow Semi Condensed';font-weight:700;font-size:30px;letter-spacing:1px;text-align:center;">ROMANEIO</div>`,
    'romaneio supplier logo header',
  );

  template = replaceOnce(
    template,
    `        <div style="margin-top:18px;border:1px solid #ddd7cd;border-radius:10px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f4f0e8;border-bottom:1px solid #ddd7cd;">
            <span style="font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#5f584f;">Entrega / cliente</span>`,
    `        <div class="romaneio-supplier-block" style="margin-top:18px;border:1px solid #ddd7cd;border-radius:10px;overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#f4f0e8;border-bottom:1px solid #ddd7cd;">
            <span style="font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#5f584f;">Fornecedor</span>
            <button data-noprint="" sc-camel-on-click="{{ toggleTcconFornecedor }}" style="display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid #c7d3de;border-radius:7px;background:#fff;color:var(--accent,#2f5d86);font-size:11.5px;font-weight:700;cursor:pointer;">
              <span style="width:22px;height:22px;border-radius:50%;overflow:hidden;display:inline-flex;"><image-slot id="tccon-romaneio-button-logo" shape="circle" placeholder="TCCON" src="58e4613a-04c8-4f7e-8821-e795125bd831"></image-slot></span>
              {{ romFornecedorBtn }}
            </button>
          </div>
          <div class="responsive-grid romaneio-supplier-grid" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;padding:12px;">
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Razão social</span><input value="{{ romFornecedor.nome }}" sc-camel-on-input="{{ onRomFornecedorNome }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">CNPJ / CPF</span><input value="{{ romFornecedor.cnpj }}" sc-camel-on-input="{{ onRomFornecedorCnpj }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Telefone</span><input value="{{ romFornecedor.telefone }}" sc-camel-on-input="{{ onRomFornecedorTelefone }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
            <label style="grid-column:1 / -1;"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Endereço do fornecedor</span><input value="{{ romFornecedor.endereco }}" sc-camel-on-input="{{ onRomFornecedorEndereco }}" style="width:100%;margin-top:3px;padding:7px 8px;border:1px solid #ddd7cd;border-radius:5px;"></label>
          </div>
        </div>

        <div style="margin-top:10px;border:1px solid #ddd7cd;border-radius:10px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f4f0e8;border-bottom:1px solid #ddd7cd;">
            <span style="font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#5f584f;">Entrega / cliente</span>`,
    'romaneio supplier and client sections',
  );

  template = replaceOnce(
    template,
    `    body.printing-romaneio .romaneio-client-grid{grid-template-columns:2fr 1fr 1fr 90px !important;gap:6px !important;padding:7px !important;}`,
    `    body.printing-romaneio .romaneio-supplier-block{margin-top:8px !important;}
    body.printing-romaneio .romaneio-supplier-grid{grid-template-columns:2fr 1fr 1fr !important;gap:6px !important;padding:7px !important;}
    body.printing-romaneio .romaneio-client-grid{grid-template-columns:2fr 1fr 1fr 90px !important;gap:6px !important;padding:7px !important;}`,
    'romaneio supplier print layout',
  );
}

if (!template.includes('class="romaneio-receipt"')) {
  const receiptInsideSummary = `            <div style="display:grid;grid-template-columns:1fr 150px;gap:12px;margin-top:12px;">
              <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Nome legÃ­vel do recebedor</span><input value="{{ romRecebedor }}" sc-camel-on-input="{{ onRomRecebedor }}" style="width:100%;margin-top:5px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;"></label>
              <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Data recebimento</span><input value="{{ romRecebimentoData }}" sc-camel-on-input="{{ onRomRecebimentoData }}" style="width:100%;margin-top:5px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;text-align:center;"></label>
            </div>`;
  template = replaceOnce(
    template,
    receiptInsideSummary,
    '',
    'remove receipt signature from romaneio summary',
  );

  template = replaceOnce(
    template,
    `          </div>
        </div>
      </div>

      <div class="romaneio-history" style="margin-top:22px;">`,
    `          </div>
        </div>

        <div class="romaneio-receipt" style="display:grid;grid-template-columns:1fr 180px;gap:24px;margin-top:30px;padding-top:28px;border-top:1px solid #ddd7cd;break-inside:avoid;page-break-inside:avoid;">
          <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Assinatura / nome legÃ­vel de quem recebeu</span><input value="{{ romRecebedor }}" sc-camel-on-input="{{ onRomRecebedor }}" style="width:100%;margin-top:18px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;"></label>
          <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Data do recebimento</span><input value="{{ romRecebimentoData }}" sc-camel-on-input="{{ onRomRecebimentoData }}" style="width:100%;margin-top:18px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;text-align:center;"></label>
        </div>
      </div>

      <div class="romaneio-history" style="margin-top:22px;">`,
    'move receipt signature to romaneio footer',
  );

  template = replaceOnce(
    template,
    `    body.printing-romaneio .romaneio-summary-grid{gap:12px !important;margin-top:8px !important;}`,
    `    body.printing-romaneio .romaneio-summary-grid{gap:12px !important;margin-top:8px !important;}
    body.printing-romaneio .romaneio-receipt{margin-top:18px !important;padding-top:16px !important;}`,
    'romaneio receipt print spacing',
  );
}

const legacyReceiptInsideSummary = `            <div class="responsive-grid" style="display:grid;grid-template-columns:1fr 150px;gap:12px;margin-top:12px;">
              <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Nome legÃ­vel do recebedor</span><input value="{{ romRecebedor }}" sc-camel-on-input="{{ onRomRecebedor }}" style="width:100%;margin-top:5px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;"></label>
              <label><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#8a8377;">Data recebimento</span><input value="{{ romRecebimentoData }}" sc-camel-on-input="{{ onRomRecebimentoData }}" style="width:100%;margin-top:5px;padding:9px;border:0;border-bottom:1px solid #777;background:transparent;text-align:center;"></label>
            </div>`;
if (template.includes(legacyReceiptInsideSummary)) {
  template = replaceOnce(
    template,
    legacyReceiptInsideSummary,
    '',
    'remove duplicate receipt fields above romaneio footer',
  );
}

bundle = bundle.replace(
  templatePattern,
  (_, open, __, close) =>
    `${open}${JSON.stringify(template).replaceAll('</script', '<\\u002Fscript')}${close}`,
);
bundle = bundle.replace('<title>Bundled Page</title>', '<title>TCCON Orçamentos</title>');
fs.writeFileSync(bundlePath, bundle, 'utf8');
