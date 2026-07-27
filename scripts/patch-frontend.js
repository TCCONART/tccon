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
  '<div style="display:flex;align-items:center;gap:9px;">\n        <button sc-camel-on-click="{{ toggleMargem }}"',
  '<div class="app-actions" style="display:flex;align-items:center;gap:9px;">\n        <button sc-camel-on-click="{{ toggleMargem }}"',
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

template = replaceOnce(
  template,
  '<div style="width:30px;height:30px;border-radius:50%;background:var(--accent,#2f5d86);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;font-family:\'Barlow Semi Condensed\';">{{ meInitials }}</div>',
  '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;font-family:\'Barlow Semi Condensed\';">{{ meHeaderFotoImg }}<sc-if value="{{ meNoFoto }}" hint-placeholder-val="{{ true }}"><span>{{ meInitials }}</span></sc-if></div>',
  'adjusted photo in toolbar',
);

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

template = replaceOnce(
  template,
  'width:60px;height:60px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};',
  'width:76px;height:76px;border-radius:50%;overflow:hidden;background:{{ u.avatarBg }};',
  'larger profile selection photo',
);

template = replaceOnce(
  template,
  'width:30px;height:30px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);',
  'width:38px;height:38px;border-radius:50%;overflow:hidden;background:var(--accent,#2f5d86);',
  'larger toolbar photo',
);

template = replaceOnce(
  template,
  'width:72px;height:72px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);',
  'width:96px;height:96px;flex:none;border-radius:50%;overflow:hidden;background:linear-gradient(140deg,var(--accent,#2f5d86),#24486a);',
  'larger profile photo preview',
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

bundle = bundle.replace(
  templatePattern,
  (_, open, __, close) =>
    `${open}${JSON.stringify(template).replaceAll('</script', '<\\u002Fscript')}${close}`,
);
bundle = bundle.replace('<title>Bundled Page</title>', '<title>TCCON Orçamentos</title>');
fs.writeFileSync(bundlePath, bundle, 'utf8');
