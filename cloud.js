/* TB Finance · camada de acesso ao Supabase (sem dependências externas). */
(function () {
  const C = window.TBCFG || {}, K = 'tbf-sess';
  let sess = null; try { sess = JSON.parse(localStorage.getItem(K)); } catch (e) {}
  const store = (s) => { sess = s; try { s ? localStorage.setItem(K, JSON.stringify(s)) : localStorage.removeItem(K); } catch (e) {} };
  const cfgOk = () => !!(C.url && C.anon && !/COLE_AQUI/.test(C.url + C.anon));
  const msg = (j) => j && (j.msg || j.error_description || j.message || j.error);
  const TR = { 'Invalid login credentials': 'E-mail ou senha incorretos', 'User already registered': 'Este e-mail já tem conta. Use "Já tenho conta".', 'Email not confirmed': 'Confirme seu e-mail antes de entrar.', 'New password should be different from the old password.': 'A nova senha precisa ser diferente da atual.' };
  const tr = (m) => { if (!m) return 'Erro inesperado'; if (TR[m]) return TR[m]; if (/Password should be at least/i.test(m)) return 'A senha precisa ter ao menos 8 caracteres.'; if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.'; return m; };
  async function raw(path, o) {
    o = o || {}; const h = Object.assign({ apikey: C.anon, 'Content-Type': 'application/json' }, o.headers || {});
    h.Authorization = 'Bearer ' + ((!o.anon && sess && sess.access_token) || C.anon);
    try { return await fetch(C.url + path, { method: o.method || 'GET', headers: h, body: o.body == null ? undefined : (typeof o.body == 'string' ? o.body : JSON.stringify(o.body)) }); }
    catch (e) { throw new Error('Sem conexão com o servidor'); }
  }
  function setS(j) { if (!j || !j.access_token) return; store({ access_token: j.access_token, refresh_token: j.refresh_token || (sess && sess.refresh_token), expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user || (sess && sess.user) }); }
  async function refresh() { if (!sess || !sess.refresh_token) return false; try { const r = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', anon: 1, body: { refresh_token: sess.refresh_token } }); if (!r.ok) return false; setS(await r.json()); return true; } catch (e) { return false; } }
  async function call(path, o) {
    if (sess && sess.expires_at - 60 < Date.now() / 1000) await refresh();
    let r = await raw(path, o); if (r.status == 401 && sess && await refresh()) r = await raw(path, o);
    if (r.status == 401) { store(null); if (typeof showAuth == 'function') showAuth(); throw 0; }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(tr(msg(j)) || 'Erro (' + r.status + ')'); return j;
  }
  const rpc = (n, a) => call('/rest/v1/rpc/' + n, { method: 'POST', body: a || {} });
  let memo = null;
  window.TBC = {
    cfgOk, session: () => sess, rpc,
    async login(email, password) { const r = await raw('/auth/v1/token?grant_type=password', { method: 'POST', anon: 1, body: { email, password } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(tr(msg(j))); setS(j); },
    async signup(name, email, password) { const r = await raw('/auth/v1/signup', { method: 'POST', anon: 1, body: { email, password, data: { name } } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(tr(msg(j))); if (j.access_token) { setS(j); return { ok: 1 }; } return { confirm: 1 }; },
    google() { location.href = C.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(location.origin + location.pathname); },
    async forgot(email) { await raw('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', anon: 1, body: { email } }); },
    setPassword(pw) { return call('/auth/v1/user', { method: 'PUT', body: { password: pw } }); },
    async logout() { try { await raw('/auth/v1/logout', { method: 'POST' }); } catch (e) {} store(null); try { localStorage.removeItem('tbf-ctx'); } catch (e) {} },
    async fromHash() {
      const h = location.hash.slice(1); if (!h.includes('access_token')) return null;
      const p = new URLSearchParams(h); history.replaceState(null, '', location.pathname + location.search);
      setS({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600 });
      try { const r = await raw('/auth/v1/user'); if (r.ok) sess.user = await r.json(), store(sess); } catch (e) {}
      return p.get('type') || 'login';
    },
    me: () => rpc('my_context'),
    getState: (since) => rpc('get_state', { p_since: since == null ? null : since }),
    saveState: (data, base) => rpc('save_state', { p_data: data, p_base: base }),
    createHousehold: (name) => rpc('create_household', { p_name: name }),
    invite: (role) => rpc('new_invite', { p_role: role || 'editor' }),
    join: (code) => rpc('join_household', { p_code: code }),
    members: () => rpc('list_members'),
    setRole: (uid, role) => rpc('set_member_role', { p_user: uid, p_role: role }),
    removeMember: (uid) => rpc('remove_member', { p_user: uid }),
    saveProfile: (name, brand) => rpc('save_profile', { p_name: name, p_brand: brand }),
    pushSave: (s) => rpc('save_push', { p_endpoint: s.endpoint, p_p256dh: s.keys.p256dh, p_auth: s.keys.auth, p_ua: navigator.userAgent.slice(0, 120) }),
    pushDrop: (endpoint) => rpc('drop_push', { p_endpoint: endpoint }),
    async market(tickers, force) {
      if (!force && memo && Date.now() - memo.t < 5 * 60e3 && memo.k == (tickers || []).join()) return memo.v;
      const v = await call('/functions/v1/market', { method: 'POST', body: { tickers: tickers || [] } });
      memo = { t: Date.now(), k: (tickers || []).join(), v }; return v;
    },
  };
})();
