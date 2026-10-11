/* TB Finance · extras: Supabase, marca, pessoas/acessos, ícones, notificações, push e investimentos.
   Carregado depois do script principal: redefine funções e envolve telas já existentes. */
const MK0 = (document.querySelector('#lg img.mk') || {}).src || MK; // marca padrão sem margem: a mesma da abertura
MK = MK0;
const ROLES = { owner: 'Proprietário', admin: 'Administrador', editor: 'Editor', viewer: 'Leitor' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $v = (id) => (document.getElementById(id) || {}).value || '';
let CTX = null, VER = 0, PUSHING = 0, DIRTY = 0, TMR = null, POLLT = null, BRAND = {}, MEMBERS = null, PUSHON = false, MKT = null, MKTS = '', ASKF = null;
const canEdit = () => !CTX || CTX.role != 'viewer';
const canAdmin = () => !!CTX && (CTX.role == 'owner' || CTX.role == 'admin');
const modalOpen = () => document.getElementById('mod').classList.contains('on');
const applyCats = () => { if (S && S.cats) { for (const k in CATS) delete CATS[k]; Object.assign(CATS, S.cats); } };
const LOCAL = !!(window.TBCFG && window.TBCFG.local);
const cacheKey = () => LOCAL ? 'tbf-data-v1' : 'tbf-cache-' + (CTX && CTX.hid || 'x');
const writeCache = () => { try { localStorage.setItem(cacheKey(), JSON.stringify(S)); } catch (e) {} };
const readCache = () => { try { return JSON.parse(localStorage.getItem(cacheKey())); } catch (e) { return null; } };

/* ---------- estilos novos ---------- */
document.head.insertAdjacentHTML('beforeend', `<style id="xcss">
.ib{width:40px;height:40px;display:inline-grid;place-items:center;border-radius:12px;color:var(--m);flex:none;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ib svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.ib:active,.ib:hover{background:var(--gs);color:var(--g)}.ib.dl:active,.ib.dl:hover{background:var(--rs);color:var(--r)}
.ia{display:inline-flex;align-items:center;gap:0;flex:none}.rt{display:flex;flex-direction:column;align-items:flex-end}.rt .ia{margin:-2px -8px -8px 0}
.vt{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin-top:8px;border-radius:12px;background:var(--gs);color:var(--g);font-weight:600;font-size:14px}
.hl{display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:20px!important;min-width:0}.hlg{width:26px;height:26px;object-fit:contain;border-radius:6px;flex:none}
.sw{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.sw button{width:36px;height:36px;border-radius:50%;border:2px solid var(--l)}.sw button.on{outline:2px solid var(--t);outline-offset:2px}
.bn{background:var(--gs);color:var(--g);border-radius:12px;padding:10px 12px;font-size:13px;margin-bottom:12px}
select.rs{background:var(--c);color:var(--t);border:1px solid var(--l);border-radius:10px;padding:8px;font-size:13px}
</style>`);
const IP = { edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', del: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10 11v6M14 11v6"/>', add: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', mail: '<path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/>', check: '<path d="M5 12l5 5 9-10"/>', refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>' };
const ib = (kind, fn, label, cls) => `<button class="ib ${kind == 'del' || kind == 'x' ? 'dl' : ''} ${cls || ''}" onclick="event.stopPropagation();${fn}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${IP[kind]}</svg></button>`;
function ask(title, msg, fn, label) { ASKF = fn; sheet(`<div class="b" style="font-size:18px;margin-bottom:6px">${esc(title)}</div><p class="m" style="margin-bottom:14px">${esc(msg)}</p><button class="btn" style="background:var(--r);color:#fff" onclick="cl();ASKF()">${label || 'Excluir'}</button><button class="btn s" onclick="cl()">Cancelar</button>`); }

/* ---------- ponte com o Supabase ---------- */
async function api(u, o) {
  o = o || {}; const b = o.body ? JSON.parse(o.body) : {};
  if (u == '/me') return CTX;
  if (u == '/invite') return TBC.invite(b.role);
  if (u == '/join') return TBC.join(b.code);
  if (u == '/push/key') return { key: TBCFG.vapid && !/COLE_AQUI/.test(TBCFG.vapid) ? TBCFG.vapid : null };
  if (u == '/push/subscribe') return TBC.pushSave(b);
  if (u == '/benchmarks') { const m = await TBC.market([]), v = (k) => (m.bench.values && m.bench.values[k]) || null, L = [['selic', 'Selic meta (% a.a.)'], ['cdi', 'CDI (% a.a.)'], ['ipca', 'IPCA acumulado 12 meses (%)']]; return { items: L.map(([k, label]) => ({ k, label, value: v(k) ? v(k).v : null, date: v(k) ? v(k).d : null })), source: m.bench.source, updated: m.fetchedAt }; }
  throw new Error('Recurso indisponível nesta versão');
}
const v8 = (id) => $v(id);
let _lm = null;
async function localMarket(tickers) {
  if (_lm && Date.now() - _lm.t < 30 * 60e3) return _lm.v;
  const SG = { selic: 432, cdi: 4389, ipca: 13522 }, errors = [], values = {};
  await Promise.all(Object.entries(SG).map(async ([k, c]) => {
    try {
      const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + c + '/dados/ultimos/1?formato=json', { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(), x = j && j[0], v = x ? parseFloat(String(x.valor).replace(',', '.')) : NaN;
      if (!isFinite(v)) throw new Error('sem dado'); const [dd, mm, yy] = x.data.split('/');
      values[k] = { d: yy + '-' + mm + '-' + dd, v };
    } catch (e) { values[k] = null; errors.push('Banco Central ' + k.toUpperCase() + ': ' + (e.message || 'falha')); }
  }));
  if (tickers && tickers.length) errors.push('Cotações de ações exigem servidor (versão futura).');
  const out = { bench: { values, hist: {}, source: 'Banco Central do Brasil (SGS)' }, quotes: {}, errors, fetchedAt: new Date().toISOString() };
  if (Object.values(values).some((v) => v)) _lm = { t: Date.now(), v: out };
  return out;
}
if (LOCAL) TBC.market = localMarket;
function showAuth() {
  const a = document.getElementById('auth'); a.style.display = 'flex'; const lg = AM == 'login';
  a.innerHTML = `<div class="card"><img src="${MK}" style="display:block;margin:0 auto 12px;width:96px" alt=""><div class="b" style="font-size:24px;margin-bottom:4px">TB Finance</div><p class="m" style="margin-bottom:14px">${lg ? 'Entre na sua conta' : 'Crie sua conta'}</p><button class="btn s" onclick="TBC.google()">Continuar com Google</button><p class="m" style="text-align:center;margin:10px 0">ou com e-mail e senha</p>${lg ? '' : '<label>Nome</label><input id="an" autocomplete="name">'}<label>E-mail</label><input id="ae" type="email" autocomplete="email"><label>Senha (mín. 8 caracteres)</label><input id="ap" type="password" autocomplete="${lg ? 'current-password' : 'new-password'}"><p id="ar" class="r"></p><button class="btn" onclick="authGo()">${lg ? 'Entrar' : 'Criar conta'}</button>${lg ? '<button class="m" style="display:block;margin:12px auto 0" onclick="forgot()">Esqueci minha senha</button>' : ''}<div class="sp"></div><button class="btn s" onclick="AM=AM==\'login\'?\'reg\':\'login\';showAuth()">${lg ? 'Criar uma conta' : 'Já tenho conta'}</button></div>`;
}
async function authGo() {
  const r = document.getElementById('ar'); r.textContent = '';
  try {
    const e = $v('ae').trim(), p = $v('ap');
    if (!e || !p) throw new Error('Preencha e-mail e senha');
    if (AM == 'login') await TBC.login(e, p);
    else { if (p.length < 8) throw new Error('A senha precisa ter ao menos 8 caracteres'); if (!$v('an').trim()) throw new Error('Informe seu nome'); const x = await TBC.signup($v('an').trim(), e, p); if (x.confirm) { r.className = 'm'; r.textContent = 'Enviamos um e-mail de confirmação. Confirme e depois entre.'; return; } }
    document.getElementById('auth').style.display = 'none'; boot();
  } catch (er) { r.className = 'r'; r.textContent = er.message || 'Erro'; }
}
async function logout() { await TBC.logout(); location.reload(); }
function gInit() {}
async function sendForgot() { try { await TBC.forgot($v('fe').trim()); document.getElementById('fm').textContent = 'Se o e-mail existir, enviamos o link de recuperação.'; } catch (e) { document.getElementById('fm').textContent = e.message; } }
async function doReset() { try { const p = $v('rp'); if (p.length < 8) throw new Error('Mínimo de 8 caracteres'); await TBC.setPassword(p); cl(); toast('Senha alterada'); boot(); } catch (e) { document.getElementById('fm').textContent = e.message || 'Erro'; } }
function showSetup() { const a = document.getElementById('auth'); a.style.display = 'flex'; a.innerHTML = `<div class="card"><div class="b" style="font-size:20px;margin-bottom:8px">Falta configurar</div><p class="m">Abra o arquivo <b>config.js</b> e preencha a URL e a chave pública (anon) do seu projeto Supabase. O passo a passo está no README.</p></div>`; }
function showHH() { const a = document.getElementById('auth'); a.style.display = 'flex'; a.innerHTML = `<div class="card"><div class="b" style="font-size:22px;margin-bottom:4px">Seu painel</div><p class="m" style="margin-bottom:12px">Crie o painel financeiro ou entre em um já existente com o código de convite.</p><label>Nome do painel</label><input id="hn" value="Família"><button class="btn" onclick="mkHH()">Criar painel</button><div class="sp"></div><label>Código de convite</label><input id="hc" style="text-transform:uppercase" autocapitalize="characters"><p id="hr" class="r"></p><button class="btn s" onclick="jnHH()">Entrar com código</button><button class="m" style="display:block;margin:12px auto 0" onclick="logout()">Sair da conta</button></div>`; }
async function mkHH() { try { await TBC.createHousehold($v('hn')); boot(); } catch (e) { document.getElementById('hr').textContent = e.message; } }
async function jnHH() { try { await TBC.join($v('hc')); boot(); } catch (e) { document.getElementById('hr').textContent = e.message; } }
function joinCode() { form('Entrar com código', [{ k: 'code', l: 'Código do convite', req: 1 }], (v) => { api('/join', { body: JSON.stringify({ code: v.code }) }).then(() => { boot(); toast('Painel conectado'); }).catch((e) => toast(e.message || 'Código inválido')); }); }

async function bootLocal() {
  ME = { email: '', name: '' }; CTX = null;
  let d = null; try { d = JSON.parse(localStorage.getItem('tbf-data-v1')); } catch (e) {}
  S = (d && d.tx) ? d : demo(); applyCats();
  try { applyBrand(JSON.parse(localStorage.getItem('tbf-brand') || '{}')); } catch (e) {}
  const a = document.getElementById('auth'); if (a) a.style.display = 'none';
  try { writeCache(); } catch (e) {}
  draw(1); try { autoBk(); } catch (e) {}
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  openFromUrl();
}
async function boot() {
  if (LOCAL) return bootLocal();
  if (!TBC.cfgOk()) { showSetup(); return; }
  try { const h = await TBC.fromHash(); if (h == 'recovery') { resetUI('x'); return; } } catch (e) {}
  if (!TBC.session()) { showAuth(); return; }
  let off = 0;
  try { CTX = await TBC.me(); try { localStorage.setItem('tbf-ctx', JSON.stringify(CTX)); } catch (e) {} }
  catch (e) { if (e === 0) return; try { CTX = JSON.parse(localStorage.getItem('tbf-ctx')); } catch (_) {} off = 1; if (!CTX) { showAuth(); toast(e.message || 'Sem conexão'); return; } }
  ME = { email: CTX.email, name: CTX.name };
  if (!CTX.hid) { showHH(); return; }
  document.getElementById('auth').style.display = 'none'; applyBrand(CTX.brand);
  let st = null; if (!off) { try { st = await TBC.getState(); } catch (e) { if (e === 0) return; off = 1; } }
  const cache = readCache();
  if (st && st.data && st.data.tx) { S = st.data; VER = st.version; writeCache(); }
  else if (off) { if (!cache) { toast('Sem conexão e sem dados salvos'); return; } S = cache; toast('Sem conexão: usando os dados salvos no aparelho'); }
  else { let legacy = null; try { legacy = JSON.parse(localStorage.getItem('tbf-data-v1')); } catch (_) {} S = (cache && cache.tx) ? cache : (legacy && legacy.tx && !legacy.demo) ? legacy : demo(); VER = st ? st.version : 0; DIRTY = 1; }
  applyCats(); draw(1);
  if (DIRTY) pushNow();
  clearInterval(POLLT); POLLT = setInterval(() => { if (!document.hidden) pull(); }, 45000);
  openFromUrl();
}
function openFromUrl() { const g = new URLSearchParams(location.search).get('go'); if (g && VIEWS[g]) { history.replaceState(null, '', location.pathname); go(g); } }
function save() {
  try { writeCache(); } catch (e) {}
  if (!CTX) return;
  if (!canEdit()) { toast('Seu acesso é somente leitura'); VER = -1; pull(); return; }
  DIRTY = 1; clearTimeout(TMR); TMR = setTimeout(pushNow, 700);
}
const ARR = ['tx', 'accs', 'cards', 'goals', 'invs', 'rem', 'debts', 'notifs', 'pays', 'cmp'];
function mergeS(loc, srv) {
  const o = Object.assign({}, srv, loc);
  ARR.forEach((k) => { if (Array.isArray(loc[k]) || Array.isArray(srv[k])) { const m = new Map(); (srv[k] || []).forEach((x) => m.set(x.id, x)); (loc[k] || []).forEach((x) => m.set(x.id, x)); o[k] = [...m.values()]; } });
  ['bud', 'snap', 'isnap'].forEach((k) => { o[k] = Object.assign({}, srv[k] || {}, loc[k] || {}); });
  return o;
}
async function pushNow() {
  if (PUSHING) return; PUSHING = 1; let fail = 0;
  try {
    while (DIRTY) {
      DIRTY = 0; const r = await TBC.saveState(S, VER);
      if (r.conflict) { S = mergeS(S, r.data); VER = r.version; DIRTY = 1; applyCats(); writeCache(); if (!modalOpen()) draw(); } else VER = r.version;
    }
  } catch (e) {
    DIRTY = 1; fail = 1; if (e !== 0) { if (/somente leitura/i.test(e.message || '')) { DIRTY = 0; toast('Seu acesso é somente leitura'); VER = -1; pull(); } else if (!window.__offToast) { window.__offToast = 1; toast('Sem conexão: salvo no aparelho, envio depois'); } }
  } finally { PUSHING = 0; if (!fail) window.__offToast = 0; }
}
async function pull() {
  if (PUSHING || !CTX) return; if (DIRTY) { pushNow(); return; }
  try { const r = await TBC.getState(VER < 0 ? null : VER); if (r.changed) { S = r.data; VER = r.version; applyCats(); writeCache(); if (!modalOpen()) draw(); } } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
window.addEventListener('online', () => { if (DIRTY) pushNow(); });
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (ev) => { if (ev.data && ev.data.go && VIEWS[ev.data.go]) go(ev.data.go); });

/* ---------- identidade visual (por usuário, salva no Supabase) ---------- */
const PALETTE = [['#a9810f', 'Dourado (padrão)'], ['#2563eb', 'Azul'], ['#0f9d58', 'Verde'], ['#7c3aed', 'Roxo'], ['#db2777', 'Rosa'], ['#ea580c', 'Laranja']];
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixc = (h, t, a) => '#' + hex2(h).map((c) => Math.round(c + (t - c) * a).toString(16).padStart(2, '0')).join('');
const lumi = (h) => { const [r, g, b] = hex2(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
function applyBrand(b) {
  b = b || {}; BRAND = b; let st = document.getElementById('brandcss'); if (!st) { st = document.createElement('style'); st.id = 'brandcss'; document.head.appendChild(st); }
  if (b.accent && /^#[0-9a-f]{6}$/i.test(b.accent) && b.accent.toLowerCase() != '#a9810f') {
    const a = b.accent, dk = mixc(a, 0, .3), lt = mixc(a, 255, .4), tx = lumi(a) > .6 ? '#1a1405' : '#ffffff';
    st.textContent = `:root,:root[data-theme]{--g:${a}!important;--gs:${a}22!important}.hero{background:linear-gradient(135deg,${lt},${dk})!important;color:${tx}!important}.hero .m{color:${tx}cc!important}`;
  } else st.textContent = '';
  MK = b.logo && /^data:image\/(png|jpeg|webp);base64,/.test(b.logo) ? b.logo : MK0;
  const sp = document.querySelector('#lg img.mk'); if (sp) sp.src = MK;
  try { localStorage.setItem('tbf-brand', JSON.stringify(b)); } catch (e) {}
}
try { const b0 = JSON.parse(localStorage.getItem('tbf-brand')); if (b0) applyBrand(b0); } catch (e) {}
async function saveBrand(b) { if (LOCAL) { applyBrand(b); try { localStorage.setItem('tbf-brand', JSON.stringify(b)); toast('Aparência salva'); } catch (e) { toast('Logo grande demais para salvar'); } return; } applyBrand(b); try { await TBC.saveProfile(CTX.name, b); CTX.brand = b; try { localStorage.setItem('tbf-ctx', JSON.stringify(CTX)); } catch (e) {} toast('Aparência salva'); } catch (e) { if (e !== 0) toast('Não foi possível salvar: ' + (e.message || 'erro')); } draw(); }
function setAccent(c) { saveBrand(Object.assign({}, BRAND, { accent: c })); }
function resetBrand() { ask('Restaurar aparência padrão?', 'A cor e a logo voltam ao padrão do TB Finance.', () => saveBrand({}), 'Restaurar'); }
function pickLogo() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const im = new Image(), u = URL.createObjectURL(f);
    im.onload = () => { const s = Math.min(1, 256 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); saveBrand(Object.assign({}, BRAND, { logo: c.toDataURL('image/png') })); };
    im.onerror = () => toast('Imagem inválida'); im.src = u; };
  i.click();
}
function delLogo() { const b = Object.assign({}, BRAND); delete b.logo; saveBrand(b); }
const brandHtml = () => `<div class="card"><p class="m">Opcional e só seu: cada pessoa escolhe a própria cor e logo, e isso fica salvo na sua conta.</p><div class="sw">${PALETTE.map(([c, n]) => `<button style="background:${c}" class="${(BRAND.accent || '#a9810f').toLowerCase() == c ? 'on' : ''}" onclick="setAccent('${c}')" aria-label="${n}" title="${n}"></button>`).join('')}</div><div class="li row"><span>Outra cor</span><input type="color" value="${BRAND.accent || '#a9810f'}" onchange="setAccent(this.value)" aria-label="Escolher cor" style="width:44px;height:36px;border:0;background:none"></div><div class="li row"><span>Logo</span><span class="ia"><img src="${MK}" alt="" style="width:30px;height:30px;object-fit:contain;margin-right:6px">${ib('edit', 'pickLogo()', 'Trocar logo')}${BRAND.logo ? ib('del', 'delLogo()', 'Remover logo') : ''}</span></div><button class="btn s" onclick="resetBrand()">Restaurar aparência padrão</button></div>`;

/* ---------- pessoas e acessos ---------- */
function addPerson() { form('Nova pessoa', [{ k: 'n', l: 'Nome', req: 1 }], (v) => { const n = v.n.trim(); if (S.people.includes(n)) { toast('Essa pessoa já existe'); return; } S.people.push(n); }); }
function editPerson(i) { form('Editar pessoa', [{ k: 'n', l: 'Nome', req: 1 }], (v) => { const o = S.people[i], n = v.n.trim(); if (n != o && S.people.includes(n)) { toast('Esse nome já existe'); return; } S.people[i] = n; S.tx.forEach((x) => { if (x.person == o) x.person = n; }); }, { n: S.people[i] }); }
function delPerson(i) { const n = S.people[i]; ask('Excluir ' + n + '?', 'Os lançamentos dessa pessoa passam a ficar como "Compartilhado".', () => { S.tx.forEach((x) => { if (x.person == n) x.person = 'Compartilhado'; }); S.people.splice(i, 1); save(); draw(); toast('Pessoa excluída'); }); }
async function loadMembers() { try { MEMBERS = await TBC.members(); } catch (e) { MEMBERS = []; } if (V == 'cfg' && !modalOpen()) draw(); }
function roleOpts(cur) { const l = CTX.role == 'owner' ? ['admin', 'editor', 'viewer'] : ['editor', 'viewer']; return l.map((r) => `<option value="${r}" ${r == cur ? 'selected' : ''}>${ROLES[r]}</option>`).join(''); }
async function setRole(uid, r) { try { await TBC.setRole(uid, r); toast('Permissão atualizada'); } catch (e) { toast(e.message); } loadMembers(); }
function rmMember(uid, name) { ask('Remover ' + name + '?', 'Essa pessoa perde o acesso aos dados do painel.', async () => { try { await TBC.removeMember(uid); toast('Acesso removido'); } catch (e) { toast(e.message); } loadMembers(); }, 'Remover'); }
function invite() { if (!canAdmin()) { toast('Só administradores convidam'); return; } sheet(`<div class="b" style="font-size:18px;margin-bottom:6px">Convidar para o painel</div><p class="m" style="margin-bottom:12px">Escolha o que a pessoa poderá fazer:</p><button class="btn s" onclick="mkInvite('editor')">Editor · lança e edita</button><button class="btn s" onclick="mkInvite('viewer')">Leitor · só visualiza</button>${CTX.role == 'owner' ? '<button class="btn s" onclick="mkInvite(\'admin\')">Administrador · também gerencia acessos</button>' : ''}<button class="btn s" onclick="cl()">Cancelar</button>`); }
async function mkInvite(role) { try { const j = await api('/invite', { body: JSON.stringify({ role }) }); sheet(`<div class="b" style="font-size:18px;margin-bottom:12px">Convite · ${ROLES[role]}</div><p class="m">A pessoa cria a conta, escolhe "Entrar com código" e digita:</p><div class="big" style="text-align:center;margin:16px 0;letter-spacing:.1em">${esc(j.code)}</div><p class="m">Vale por 48 horas e só pode ser usado uma vez.</p><button class="btn s" onclick="cl()">Fechar</button>`); } catch (e) { toast(e.message || 'Erro'); } }
function peopleHtml() {
  let h = `<h2>Pessoas</h2><div class="card">${S.people.map((p, i) => `<div class="li row"><span>${esc(p)}</span><span class="ia">${ib('edit', `editPerson(${i})`, 'Editar ' + esc(p))}${S.people.length > 1 ? ib('del', `delPerson(${i})`, 'Excluir ' + esc(p)) : ''}</span></div>`).join('')}<div class="row" style="justify-content:space-between"><span class="m">Nomes usados nos lançamentos</span>${ib('add', 'addPerson()', 'Adicionar pessoa')}</div></div>`;
  if (CTX) { if (MEMBERS == null) loadMembers(); h += `<h2>Quem tem acesso</h2><div class="card">${(MEMBERS || []).map((m) => `<div class="li row"><span style="min-width:0"><b>${esc(m.name || m.email)}</b><br><span class="m">${esc(m.email)}</span></span><span class="ia">${m.role == 'owner' || !canAdmin() || (CTX.role == 'admin' && m.role == 'admin') || m.user_id == CTX.uid ? `<span class="tag">${ROLES[m.role]}</span>` : `<select class="rs" onchange="setRole('${m.user_id}',this.value)" aria-label="Permissão de ${esc(m.name || m.email)}">${roleOpts(m.role)}</select>`}${canAdmin() && m.role != 'owner' && m.user_id != CTX.uid && !(CTX.role == 'admin' && m.role == 'admin') ? ib('del', `rmMember('${m.user_id}','${esc(m.name || m.email).replace(/'/g, '')}')`, 'Remover acesso') : ''}</span></div>`).join('') || '<p class="m">Carregando…</p>'}${canAdmin() ? `<div class="row" style="justify-content:space-between"><span class="m">Convidar com código</span>${ib('add', 'invite()', 'Convidar pessoa')}</div>` : '<p class="m">Só administradores convidam e alteram acessos.</p>'}</div>`; }
  return h;
}
const accountHtml = () => `<h2>Conta</h2><div class="card"><div class="li row"><span class="m">Conectado como</span><b>${esc(CTX ? CTX.email : '')}</b></div><div class="li row"><span class="m">Seu acesso</span><b>${CTX ? ROLES[CTX.role] : ''}</b></div>${CTX && CTX.role == 'viewer' ? '<p class="bn">Acesso somente leitura: alterações não são salvas.</p>' : ''}<button class="btn s" onclick="logout()">Sair da conta</button></div>`;
const catsHtml = () => `<h2>Categorias</h2><div class="card">${Object.keys(CATS).map((c) => `<div class="li row"><span>${esc(c)} <span class="m">· ${CATS[c].length} sub</span></span><span class="ia">${ib('del', `delCatOne('${esc(c).replace(/'/g, '')}')`, 'Excluir categoria ' + esc(c))}</span></div>`).join('')}<div class="row" style="justify-content:space-between"><span class="m">Nova categoria ou subcategoria</span>${ib('add', 'newCat()', 'Adicionar categoria')}</div></div>`;
function delCatOne(c) { ask('Excluir a categoria ' + c + '?', 'Lançamentos antigos mantêm o nome, mas a categoria some das listas.', () => { delete CATS[c]; S.cats = JSON.parse(JSON.stringify(CATS)); save(); draw(); toast('Categoria excluída'); }); }
const tagH = (on) => `<span class="tag ${on ? '' : 'o'}">${on ? 'Ligado' : 'Desligado'}</span>`;
const _cfg = VIEWS.cfg;
VIEWS.cfg = function () {
  let h = _cfg.call(VIEWS); if (!CTX && !LOCAL) return h;
  if (LOCAL) {
    h = h.replace(/<h2>Conta<\/h2>[\s\S]*?(?=<h2>Pessoas<\/h2>)/, localInfo());
    h = h.replace(/<h2>Pessoas<\/h2>[\s\S]*?(?=<h2>Aparência<\/h2>)/, peopleHtml());
    h = h.replace(/(<h2>Aparência<\/h2>[\s\S]*?)(?=<h2>)/, (m) => m + '<h2>Identidade visual</h2>' + brandHtml());
    h = h.replace('<h2>Notificações</h2><div class="card">', `<h2>Notificações</h2><div class="card"><div class="li row" onclick="askNotif()" role="button"><span>Pop-ups com o app aberto<br><span class="m">Permissão neste aparelho</span></span>${tagH(('Notification' in window) && Notification.permission == 'granted')}</div><div class="li row" onclick="exportIcs()" role="button"><span>Avisos no Calendário do celular<br><span class="m">Funcionam com o app fechado</span></span><span class="tag o">Exportar</span></div>`);
    h = h.replace(/<h2>Categorias<\/h2>[\s\S]*?<\/div>(?=\s*`?$|<)/, catsHtml());
    h = h.replace(/<button class="btn s" onclick="bks\(\)">[^<]*<\/button>/, '');
    h = h.replace(/<div class="li row" onclick="enablePush\(\)">[\s\S]*?<\/div>/, '');
    return h;
  }
  pushState();
  h = h.replace(/<h2>Conta<\/h2>[\s\S]*?(?=<h2>Pessoas<\/h2>)/, accountHtml());
  h = h.replace(/<h2>Pessoas<\/h2>[\s\S]*?(?=<h2>Aparência<\/h2>)/, peopleHtml());
  h = h.replace(/(<h2>Aparência<\/h2>[\s\S]*?)(?=<h2>)/, (m) => m + '<h2>Identidade visual</h2>' + brandHtml());
  h = h.replace('<h2>Notificações</h2><div class="card">', `<h2>Notificações</h2><div class="card"><div class="li row" onclick="togglePush()" role="button"><span>Avisos no aparelho, mesmo com o app fechado<br><span class="m">Neste aparelho</span></span>${tagH(PUSHON)}</div>`);
  h = h.replace(/<h2>Categorias<\/h2>[\s\S]*?<\/div>(?=\s*`?$|<)/, catsHtml());
  h = h.replace(/<button class="btn s" onclick="bks\(\)">[^<]*<\/button>/, '');
  h = h.replace(/<div class="li row" onclick="enablePush\(\)">[\s\S]*?<\/div>/, '');
  return h;
};

/* ---------- ícones padronizados nos lançamentos ---------- */
txRow = ((o) => (x) => o(x).replace(/(<b class="amt [^"]*">[\s\S]*?<\/b>)<\/div>$/, `<div class="rt">$1<div class="ia">${ib('edit', `edit('${x.id}')`, 'Editar lançamento')}${ib('del', `delTx('${x.id}')`, 'Excluir lançamento')}</div></div></div>`))(txRow);
function delTx(id) { const x = S.tx.find((t) => t.id == id); if (!x) return; ask('Excluir lançamento?', x.desc + ' · ' + R(Math.abs(x.val)), () => { if (x.sid && S.tx.filter((t) => t.sid == x.sid).length > 1) del(id); else { dl(id, 0); toast('Lançamento excluído'); } }); }

/* ---------- central de notificações ---------- */
const NTV = { d0: 'tx', d1: 'tx', late: 'tx', r0: 'tx', f: 'cards', lim: 'cards', bud: 'plan', b1: 'plan', b2: 'plan', goal: 'plan', iv: 'inv', low: 'home', rm: 'home' };
function openNt(id) { const n = S.notifs.find((x) => x.id == id); if (!n) return; if (!n.read) { n.read = 1; save(); } const v = NTV[(n.k || '').split(':')[0]]; if (v) go(v); else draw(); }
function tgRead(id) { const n = S.notifs.find((x) => x.id == id); if (!n) return; n.read = n.read ? 0 : 1; save(); draw(); toast(n.read ? 'Marcada como lida' : 'Marcada como não lida'); }
function dn(id) { S.notifs = S.notifs.filter((n) => n.id != id); save(); draw(); toast('Notificação excluída'); }
function readAll() { S.notifs.forEach((n) => n.read = 1); save(); draw(); }
VIEWS.notif = function () {
  const u = unread(), l = (S.notifs || []).filter((n) => NF == 'all' || !n.read);
  return `<div class="row hd"><button class="b g" onclick="go('home')">‹ Voltar</button><b>Notificações</b><button class="m b" onclick="readAll()">Ler tudo</button></div><div class="seg"><button class="${NF == 'all' ? 'on' : ''}" onclick="NF='all';draw()">Todas</button><button class="${NF == 'un' ? 'on' : ''}" onclick="NF='un';draw()">Não lidas${u ? ' (' + u + ')' : ''}</button></div>${l.length ? l.map((n) => `<div class="card nt ${n.read ? '' : 'un'}" onclick="openNt('${n.id}')"><span class="ni"></span><div style="flex:1;min-width:0"><b>${n.t}</b><p class="m">${n.b}</p><span class="m">${ago(n.ts)}</span></div><span class="ia">${ib(n.read ? 'mail' : 'check', `tgRead('${n.id}')`, n.read ? 'Marcar como não lida' : 'Marcar como lida')}${ib('del', `dn('${n.id}')`, 'Excluir notificação')}</span></div>`).join('') : `<div class="card" style="text-align:center"><img src="${MK}" style="display:block;margin:0 auto;width:84px;opacity:.6" alt=""><p class="m" style="margin-top:12px">Nenhuma notificação por aqui.</p></div>`}`;
};

/* ---------- push real (Web Push + VAPID) ---------- */
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = () => navigator.standalone || matchMedia('(display-mode: standalone)').matches;
async function pushState() { try { if (!('serviceWorker' in navigator) || !('PushManager' in window)) return; const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription(), on = !!s && Notification.permission == 'granted'; if (on !== PUSHON) { PUSHON = on; if (V == 'cfg' && !modalOpen()) draw(); } } catch (e) {} }
function togglePush() { if (PUSHON) disablePush(); else pushIntro(); }
function pushIntro() {
  if (isIOS && !standalone()) { sheet(`<div class="b" style="font-size:18px;margin-bottom:8px">Primeiro, instale o app</div><p class="m" style="margin-bottom:12px">No iPhone, os avisos só funcionam com o app instalado: toque em Compartilhar no Safari, escolha <b>Adicionar à Tela de Início</b>, abra pelo ícone e ative aqui de novo. (Exige iOS 16.4 ou mais novo.)</p><button class="btn s" onclick="cl()">Entendi</button>`); return; }
  sheet(`<div class="b" style="font-size:18px;margin-bottom:8px">Receber avisos no aparelho</div><p class="m" style="margin-bottom:12px">Vamos pedir permissão para enviar avisos de <b>contas e faturas a vencer, lembretes e vencimentos de investimentos</b>, mesmo quando o app estiver fechado. Eles chegam uma vez por dia, de manhã, sem repetir. Você pode desligar quando quiser.</p><button class="btn" onclick="cl();enablePush()">Continuar</button><button class="btn s" onclick="cl()">Agora não</button>`);
}
async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification == 'undefined') { toast('Este navegador não suporta avisos'); return; }
    const k = await api('/push/key'); if (!k.key) { toast('Chave de push não configurada (veja o README)'); return; }
    const p = await Notification.requestPermission(); if (p != 'granted') { toast('Permissão negada. Libere nas configurações do navegador.'); return; }
    const reg = await navigator.serviceWorker.ready, sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) });
    await api('/push/subscribe', { body: JSON.stringify(sub.toJSON()) }); PUSHON = true; toast('Avisos ativados neste aparelho'); draw();
  } catch (e) { toast('Não foi possível ativar' + (e && e.message ? ': ' + e.message : '')); }
}
async function disablePush() { try { const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription(); if (s) { try { await TBC.pushDrop(s.endpoint); } catch (e) {} await s.unsubscribe(); } PUSHON = false; toast('Avisos desativados neste aparelho'); draw(); } catch (e) { toast('Não foi possível desativar'); } }

/* ---------- investimentos: cálculo, dados externos e histórico ---------- */
function invOps(i) { return S.tx.filter((x) => x.type == 'i' && (x.inv == i.id || (!x.inv && (x.desc == 'Aporte ' + i.name || x.desc == 'Resgate ' + i.name)))); }
function xirr(fl) { fl = fl.slice().sort((a, b) => a.d < b.d ? -1 : 1); if (fl.length < 2 || !fl.some((f) => f.v < 0) || !fl.some((f) => f.v > 0)) return null; const t0 = new Date(fl[0].d + 'T12:00:00'), cf = fl.map((x) => ({ t: (new Date(x.d + 'T12:00:00') - t0) / 864e5 / 365, v: x.v })), f = (r) => cf.reduce((s, c) => s + c.v / Math.pow(1 + r, c.t), 0); let lo = -.99, hi = 10, flo = f(lo); if (!(flo * f(hi) < 0)) return null; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2, fm = f(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } } return (lo + hi) / 2; }
function invFlows(i) { const ops = invOps(i), a = ops.filter((x) => x.val > 0).reduce((s, x) => s + x.val, 0), r = ops.filter((x) => x.val < 0).reduce((s, x) => s - x.val, 0), ap0 = i.ap0 != null ? i.ap0 : Math.max(0, i.ap - a + r), f = []; if (i.date && ap0 > 0) f.push({ d: i.date, v: -ap0 }); ops.forEach((x) => { if (x.date <= today) f.push({ d: x.date, v: -x.val }); }); return f; }
function invStats(i) { const gain = i.cur - i.ap, simple = i.ap > 0 ? gain / i.ap : null, f = invFlows(i); let x = null; if (i.date && f.length && dias(f.slice().sort((a, b) => a.d < b.d ? -1 : 1)[0].d) <= -30) x = xirr(f.concat([{ d: today, v: i.cur }])); return { gain, simple, xirr: x }; }
function portStats() { const l = S.invs, ap = l.reduce((s, i) => s + i.ap, 0), cur = l.reduce((s, i) => s + i.cur, 0); let fl = [], n = 0; l.forEach((i) => { if (i.date) { const f = invFlows(i); if (f.length) { fl = fl.concat(f); fl.push({ d: today, v: i.cur }); n++; } } }); const first = fl.length ? fl.reduce((m, f) => f.d < m ? f.d : m, '9999') : null; return { ap, cur, gain: cur - ap, simple: ap > 0 ? (cur - ap) / ap : null, xirr: first && dias(first) <= -30 ? xirr(fl) : null, nx: n, total: l.length }; }
function parseTaxa(t) {
  t = String(t || ''); const num = (s) => parseFloat(String(s).replace(',', '.')); let m;
  const b = (MKT && MKT.bench && MKT.bench.values) || {}, cdi = b.cdi ? b.cdi.v / 100 : null, ipca = b.ipca ? b.ipca.v / 100 : null, selic = b.selic ? b.selic.v / 100 : null;
  if ((m = t.match(/(\d+[.,]?\d*)\s*%\s*do\s*cdi/i))) return cdi == null ? { err: 'CDI indisponível' } : { a: num(m[1]) / 100 * cdi, src: 'CDI' };
  if ((m = t.match(/ipca\s*\+\s*(\d+[.,]?\d*)/i))) return ipca == null ? { err: 'IPCA indisponível' } : { a: (1 + ipca) * (1 + num(m[1]) / 100) - 1, src: 'IPCA' };
  if ((m = t.match(/selic\s*\+\s*(\d+[.,]?\d*)/i))) return selic == null ? { err: 'Selic indisponível' } : { a: selic + num(m[1]) / 100, src: 'Selic' };
  if ((m = t.match(/(\d+[.,]?\d*)\s*%\s*(a\.?\s?a\.?|ao\s*ano)/i))) return { a: num(m[1]) / 100, src: 'taxa pré-fixada' };
  return null;
}
const pct = (x, d) => x == null ? '—' : (x * 100).toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + '%';
const fdt = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso.split('-').reverse().join('/') : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
async function loadMKT(force) { MKTS = 'load'; try { MKT = await TBC.market(S.invs.map((i) => i.ticker).filter(Boolean), force); MKTS = 'ok'; } catch (e) { MKTS = 'err'; } if ((V == 'inv' || V == 'cmp') && !modalOpen()) draw(); }
function mktCard() {
  const b = MKT && MKT.bench && MKT.bench.values, ok = b && Object.values(b).some((x) => x), p = portStats(), est = []; let w = 0, wa = 0, miss = 0;
  S.invs.forEach((i) => { const t = parseTaxa(i.taxa); if (t && t.a != null) { wa += t.a * i.cur; w += i.cur; } else miss++; });
  const row = (n, k, suf) => `<div class="li row"><span>${n}</span><b>${b && b[k] ? b[k].v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '% ' + suf : 'indisponível'}</b></div>`;
  let h = `<h2>Rentabilidade da carteira</h2><div class="card"><p class="m" style="margin-bottom:8px"><b>Histórica</b> · calculada dos seus próprios lançamentos</p><div class="li row"><span>Ganho sobre o capital líquido investido</span><b class="${p.gain >= 0 ? 'p' : 'r'}">${p.simple == null ? '—' : pct(p.simple)}</b></div><div class="li row"><span>Anualizada (TIR, ponderada por valor e tempo)</span><b>${p.xirr == null ? '—' : pct(p.xirr)}</b></div><p class="m">${p.xirr == null ? 'Informe a data do primeiro aporte nos investimentos e aguarde 30+ dias para calcular a anualizada.' : (p.nx < p.total ? p.nx + ' de ' + p.total + ' investimentos têm data e entram no cálculo anualizado.' : 'Todos os investimentos entram no cálculo.')} Método: ganho = valor atual − capital líquido; a TIR considera cada aporte e resgate pela data.</p></div>`;
  h += `<div class="card"><p class="m" style="margin-bottom:8px"><b>Estimada</b> · projeção pelas taxas contratadas, <b>não é garantia</b></p><div class="li row"><span>Média ponderada ao ano</span><b>${w ? pct(wa / w) : 'indisponível'}</b></div><p class="m">${w ? (miss ? miss + ' investimento(s) sem taxa reconhecível ficaram de fora. ' : '') + 'Peso = valor atual. Depende dos indicadores abaixo.' : (S.invs.length && b ? 'Preencha a taxa (ex.: 110% do CDI, IPCA + 6%, 12% a.a.) para estimar.' : 'Sem indicadores do Banco Central no momento.')}</p></div>`;
  h += `<h2>Mercado</h2><div class="card">${row('CDI (a.a.)', 'cdi', 'a.a.')}${row('Selic meta (a.a.)', 'selic', 'a.a.')}${row('IPCA 12 meses', 'ipca', '')}<div class="row" style="margin-top:6px"><span class="m">${MKTS == 'load' ? 'Consultando…' : ok ? 'Fonte: ' + MKT.bench.source + ' · dado de ' + Object.values(b).filter((x) => x).map((x) => x.d.split('-').reverse().join('/')).sort().pop() + ' · consultado ' + fdt(MKT.fetchedAt) : 'Consulta indisponível no momento.'}</span>${ib('refresh', 'loadMKT(1)', 'Atualizar dados de mercado')}</div>${MKT && MKT.errors && MKT.errors.length ? `<p class="m">${MKT.errors.map(esc).join('<br>')}</p>` : ''}</div>`;
  const qs = S.invs.filter((i) => i.ticker); if (qs.length) h += `<div class="card"><p class="m" style="margin-bottom:6px"><b>Cotações</b> ${MKT && MKT.quotesSource ? '· ' + MKT.quotesSource : ''}</p>${qs.map((i) => { const q = MKT && MKT.quotes && MKT.quotes[i.ticker]; return `<div class="li row"><span>${esc(i.ticker)} <span class="m">${esc(i.name)}</span></span><b>${q ? R(q.price) + (q.changePct != null ? ` <span class="${q.changePct >= 0 ? 'p' : 'r'}">${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%</span>` : '') : 'indisponível'}</b></div>`; }).join('')}</div>`;
  return h;
}
const _inv = VIEWS.inv; VIEWS.inv = function () { if ((CTX || LOCAL) && !MKTS) loadMKT(); return _inv.call(VIEWS) + ((CTX || LOCAL) ? invIcons() + mktCard() : ''); };
const invIcons = () => S.invs.length ? `<h2>Gerenciar investimentos</h2><div class="card">${S.invs.map((i) => `<div class="li row"><span style="min-width:0">${esc(i.name)}<br><span class="m">${R(i.cur)}</span></span><span class="ia">${ib('add', `add('i',{inv:'${i.id}',op:'Aporte'})`, 'Novo aporte em ' + esc(i.name))}${ib('edit', `editInv('${i.id}')`, 'Editar ' + esc(i.name))}${ib('del', `delInv('${i.id}')`, 'Excluir ' + esc(i.name))}</span></div>`).join('')}</div>` : '';
const _invMenu = invMenu;
invMenu = function (id) {
  _invMenu(id); const i = S.invs.find((x) => x.id == id), st = invStats(i), q = MKT && MKT.quotes && i.ticker ? MKT.quotes[i.ticker] : null, el = document.querySelector('#sheet .m'); if (!el) return;
  const hist = (i.hist || []).slice(-6).reverse().map((h) => `<div class="li row"><span class="m">${h.m.slice(5)}/${h.m.slice(0, 4)}</span><span>${R(h.cur)} <span class="m">· acum. ${h.ap > 0 ? pct((h.cur - h.ap) / h.ap) : '—'}</span></span></div>`).join('');
  el.insertAdjacentHTML('afterend', `<div style="margin-bottom:12px"><div class="li row"><span class="m">Rentabilidade histórica</span><b class="${st.gain >= 0 ? 'p' : 'r'}">${pct(st.simple)}</b></div><div class="li row"><span class="m">Anualizada (TIR)</span><b>${st.xirr == null ? (i.date ? 'após 30 dias' : 'informe a data') : pct(st.xirr)}</b></div>${q ? `<div class="li row"><span class="m">Cotação ${esc(i.ticker)}</span><b>${R(q.price)}</b></div>${i.qty ? `<button class="btn s" onclick="cl();useQuote('${i.id}')">Atualizar valor atual (${i.qty} × cotação)</button>` : ''}` : ''}${hist ? '<p class="m" style="margin:8px 0 2px">Histórico mensal</p>' + hist : ''}</div>`);
};
function useQuote(id) { const i = S.invs.find((x) => x.id == id), q = MKT && MKT.quotes && MKT.quotes[i.ticker]; if (!q || !i.qty) return; i.cur = Math.round(i.qty * q.price * 100) / 100; save(); draw(); toast('Valor atualizado pela cotação'); }
const invFields = [{ k: 'name', l: 'Nome', req: 1 }, { k: 'inst', l: 'Instituição' }, { k: 'type', l: 'Tipo', o: INVT }];
function newInv() { form('Novo investimento', invFields.concat([{ k: 'ap', l: 'Valor aportado', t: 'number', req: 1 }, { k: 'cur', l: 'Valor atual', t: 'number' }, { k: 'date', l: 'Data do primeiro aporte', t: 'date' }, { k: 'taxa', l: 'Rentabilidade contratada (ex.: 110% do CDI)' }, { k: 'ticker', l: 'Código na B3 (opcional, ex.: PETR4)' }, { k: 'qty', l: 'Quantidade de cotas (opcional)', t: 'number' }, { k: 'venc', l: 'Vencimento (opcional)', t: 'date' }]), (v) => { S.invs.push({ id: uid(), name: v.name, inst: v.inst || '', type: v.type, ap: v.ap, ap0: v.ap, cur: v.cur || v.ap, date: v.date || '', taxa: v.taxa || '', ticker: (v.ticker || '').toUpperCase().trim(), qty: v.qty || 0, venc: v.venc || '' }); MKTS = ''; toast('Investimento adicionado'); }, { date: today }); }
function editInv(id) { const i = S.invs.find((x) => x.id == id); form('Editar investimento', invFields.concat([{ k: 'cur', l: 'Valor atual', t: 'number', req: 1 }, { k: 'date', l: 'Data do primeiro aporte', t: 'date' }, { k: 'taxa', l: 'Rentabilidade contratada (ex.: 110% do CDI)' }, { k: 'ticker', l: 'Código na B3 (opcional)' }, { k: 'qty', l: 'Quantidade de cotas (opcional)', t: 'number' }, { k: 'venc', l: 'Vencimento (opcional)', t: 'date' }]), (v) => { Object.assign(i, { name: v.name, inst: v.inst || '', type: v.type, cur: v.cur, date: v.date || '', taxa: v.taxa || '', ticker: (v.ticker || '').toUpperCase().trim(), qty: v.qty || 0, venc: v.venc || '' }); MKTS = ''; toast('Investimento atualizado'); }, Object.assign({}, i)); }
genNotifs = ((o) => function () { const r = o(); let ch = 0; const m = today.slice(0, 7); S.invs.forEach((i) => { i.hist = i.hist || []; const l = i.hist[i.hist.length - 1]; if (!l || l.m != m) { i.hist.push({ m, cur: i.cur, ap: i.ap }); ch = 1; } else if (l.cur != i.cur || l.ap != i.ap) { l.cur = i.cur; l.ap = i.ap; ch = 1; } if (i.hist.length > 36) i.hist = i.hist.slice(-36); }); return r || ch; })(genNotifs);
pushLocal = ((o) => (n) => { const p = String((n && n.k) || '').split(':')[0]; if (PUSHON && ['d0', 'd1', 'late', 'r0', 'rm', 'f', 'iv'].includes(p)) return; o(n); })(pushLocal);

function dsc(v, t) { return String(v.desc || '').trim() || v.sub || v.cat || t || 'Lançamento'; }
const _more = VIEWS.more; VIEWS.more = function () { let h = _more.call(VIEWS); return (CTX || LOCAL) ? h.replace(/<h2>Categorias<\/h2><div class="card">[\s\S]*?<\/div>\s*$/, catsHtml().replace(/^<h2>Categorias<\/h2>/, '<h2>Categorias</h2>')) : h; };


/* ================= MODO GITHUB (sem servidor) ================= */
const localInfo = () => `<h2>Seus dados</h2><div class="card"><p class="m">Tudo fica salvo <b>somente neste aparelho</b>. Faça backup com frequência (há backup automático diário e o botão de arquivo, mais abaixo). Para usar em outro celular, faça o backup aqui e restaure lá.</p></div>`;
async function askNotif() {
  if (!('Notification' in window)) { toast('Este aparelho não permite pop-ups'); return; }
  if (Notification.permission == 'granted') { toast('Pop-ups já estão permitidos'); return; }
  if (Notification.permission == 'denied') { toast('Bloqueado: libere nas configurações do navegador'); return; }
  try { const r = await Notification.requestPermission(); toast(r == 'granted' ? 'Pop-ups permitidos' : 'Permissão não concedida'); } catch (e) {}
  if (V == 'cfg') draw();
}
const icsEsc = (t) => String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsD = (d) => d.replace(/-/g, '');
function icsEvents(days) {
  days = days || 90; const lim = addD(today, days), out = [];
  const inR = (d) => d >= today && d <= lim;
  (S.tx || []).forEach((x) => { if (x.card || (x.type != 'd' && x.type != 'r') || real(x) || !inR(x.date)) return;
    out.push({ id: 'tx' + x.id, date: x.date, t: (x.type == 'r' ? 'Receber: ' : 'Vence: ') + x.desc, d: R(Math.abs(x.val)) }); });
  (S.rem || []).forEach((r) => { if (r.done || !inR(r.date)) return; out.push({ id: 'rm' + r.id, date: r.date, time: r.time || '', t: 'Lembrete: ' + r.t, d: r.note || '' }); });
  (S.invs || []).forEach((i) => { if (i.venc && inR(i.venc)) out.push({ id: 'iv' + i.id, date: i.venc, t: i.name + ' vence hoje', d: 'Valor atual: ' + R(i.cur) }); });
  const cm = today.slice(0, 7);
  (S.cards || []).forEach((k) => [0, 1, 2].forEach((n) => {
    const m = addM(cm + '-01', n).slice(0, 7), dd = m + '-' + p2(k.due);
    if (!inR(dd)) return;
    const invM = (x) => +x.date.slice(8) > k.close ? addM(x.date, 1).slice(0, 7) : x.date.slice(0, 7);
    const t = (S.tx || []).filter((x) => x.card == k.id && x.type == 'd' && invM(x) == m).reduce((a, x) => a + (+x.val || 0), 0) - (S.pays || []).filter((q) => q.card == k.id && q.m == m).reduce((a, x) => a + (+x.val || 0), 0);
    if (t > 0) out.push({ id: 'f' + k.id + m, date: dd, t: 'Vence a fatura ' + k.name, d: 'Valor da fatura: ' + R(t) });
  }));
  return out;
}
function buildIcs(ev) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TB Finance//PT-BR//', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:TB Finance'];
  const st = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  ev.forEach((e) => {
    L.push('BEGIN:VEVENT', 'UID:tbf-' + String(e.id).replace(/[^A-Za-z0-9]/g, '') + '@tbfinance', 'DTSTAMP:' + st);
    if (e.time && /^\d\d:\d\d$/.test(e.time)) { L.push('DTSTART:' + icsD(e.date) + 'T' + e.time.replace(':', '') + '00'); }
    else { L.push('DTSTART;VALUE=DATE:' + icsD(e.date), 'DTEND;VALUE=DATE:' + icsD(addD(e.date, 1))); }
    L.push('SUMMARY:' + icsEsc(e.t)); if (e.d) L.push('DESCRIPTION:' + icsEsc(e.d));
    if (e.time) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.t), 'TRIGGER:PT0M', 'END:VALARM');
    else L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.t), 'TRIGGER:-PT15H', 'END:VALARM', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.t), 'TRIGGER:PT9H', 'END:VALARM');
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR'); return L.join('\r\n') + '\r\n';
}
async function exportIcs() {
  const ev = icsEvents(90);
  if (!ev.length) { toast('Nenhum vencimento nos próximos 90 dias'); return; }
  const txt = buildIcs(ev), name = 'tb-finance-vencimentos.ics';
  try { const f = new File([txt], name, { type: 'text/calendar' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Vencimentos TB Finance' }); toast(ev.length + ' avisos exportados'); return; } } catch (e) { if (e && e.name == 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast(ev.length + ' avisos exportados: abra o arquivo para adicionar ao Calendário');
}
