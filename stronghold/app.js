/* 卫戍协议 · 战绩查询 —— 纯静态版
 * 直接在你的浏览器里调用森空岛官方接口：签名用 WebCrypto + 手写 MD5 复刻官网算法。
 * 凭据只存在本机 localStorage，不上传任何服务器。
 */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const API = 'https://zonai.skland.com';
const STORE_CREDS = 'sk_stronghold_creds_v1';
const STORE_CACHE = 'sk_stronghold_cache_v1';
const CACHE_TTL = 10 * 60 * 1000;

const DIFF = { ABYSS: '深渊', HARD: '困难', NORMAL: '普通', FUNNY: '趣味', FAST: '快速' };
const MODE = { SINGLE: '单人', MULTI: '多人' };
const PROF = { WARRIOR: '近卫', TANK: '重装', SNIPER: '狙击', CASTER: '术师', MEDIC: '医疗', SUPPORT: '辅助', SPECIAL: '特种', PIONEER: '先锋' };

const state = {
  data: null,
  filter: { result: 'all', mode: 'all', diff: 'all' },
  idx: { chars: new Map(), bonds: new Map(), strategies: new Map(), items: new Map() },
  winWindow: 10,
  busy: false,
};

/* ---------------------------------------------------------------- MD5 */

function md5(input) {
  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;
  const bitLen = len * 8;
  const buf = new Uint8Array(((len + 8) >> 6) * 64 + 64);
  buf.set(bytes);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(buf.length - 8, bitLen >>> 0, true);
  dv.setUint32(buf.length - 4, Math.floor(bitLen / 4294967296), true);

  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const rotl = (x, c) => (x << c) | (x >>> (32 - c));

  for (let off = 0; off < buf.length; off += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D; D = C; C = B;
      B = (B + rotl((A + F + K[i] + M[g]) >>> 0, S[(i >> 4) * 4 + (i % 4)])) >>> 0;
      A = tmp;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  const out = new DataView(new ArrayBuffer(16));
  out.setUint32(0, a0, true); out.setUint32(4, b0, true);
  out.setUint32(8, c0, true); out.setUint32(12, d0, true);
  let hex = '';
  for (let i = 0; i < 16; i++) hex += out.getUint8(i).toString(16).padStart(2, '0');
  return hex;
}

/* ---------------------------------------------------------------- 签名 */

async function hmacSha256Hex(message, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 官网算法：md5( hmac_sha256(path + query + timestamp + JSON({platform,timestamp,dId,vName}), token) )
async function makeSign(path, query, timestamp, dId, token) {
  const msg = path + (query || '') + timestamp +
    JSON.stringify({ platform: '3', timestamp, dId, vName: '1.0.0' });
  return md5(await hmacSha256Hex(msg, token));
}

/* ---------------------------------------------------------------- 凭据 */

let creds = null; // { k: cred, t: token, d: dId }

function loadCreds() {
  try {
    const raw = localStorage.getItem(STORE_CREDS);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.k && o.t) return { k: o.k, t: o.t, d: o.d || '' };
    }
  } catch { }
  return null;
}

function saveCreds(c) {
  creds = c;
  try { localStorage.setItem(STORE_CREDS, JSON.stringify(c)); } catch { }
}

function clearCreds() {
  creds = null;
  try { localStorage.removeItem(STORE_CREDS); localStorage.removeItem(STORE_CACHE); } catch { }
}

// 从 URL hash 取凭据（书签跳回来时）
function credsFromHash() {
  const h = location.hash.replace(/^#/, '');
  if (!h) return null;
  const p = new URLSearchParams(h);
  const k = p.get('k'), t = p.get('t'), d = p.get('d');
  if (!k || !t) return null;
  return { k, t, d: d || '' };
}

/* ---------------------------------------------------------------- 接口 */

async function apiGet(path, { query = '', role = null } = {}) {
  if (!creds) throw new Error('没有凭据');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sign = await makeSign(path, query, timestamp, creds.d, creds.t);
  const headers = {
    cred: creds.k,
    sign,
    timestamp,
    dId: creds.d,
    platform: '3',
    vName: '1.0.0',
    'Content-Type': 'application/json',
  };
  if (role) headers['sk-game-role'] = role;
  const res = await fetch(API + path + (query ? '?' + query : ''), {
    method: 'GET', headers, credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors',
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('接口返回异常（' + res.status + '）'); }
  if (json.code !== 0) {
    const err = new Error(json.message || ('code ' + json.code));
    err.code = json.code;
    throw err;
  }
  return json.data;
}

async function fetchAll() {
  const binding = await apiGet('/api/v1/game/player/binding');
  const ak = (binding?.list || []).find((x) => x.appCode === 'arknights');
  const bind = ak?.bindingList?.find((b) => !b.isDelete) || ak?.bindingList?.[0];
  if (!bind) {
    const e = new Error('账号没有绑定《明日方舟》角色，请先在森空岛 App → 我的 → 我的角色 里绑定');
    e.code = 'NO_BINDING';
    throw e;
  }
  const role = `${bind.channelMasterId}_${bind.uid}_0`;

  const resource = await apiGet('/web/v1/game/garrison/guide/resource');
  const season = resource?.seasons?.[0]?.seasonId || 'act3autochess';
  const hist = await apiGet('/web/v1/game/garrison/guide/history-log', { query: 'seasonId=' + season, role });

  return { season, seasonName: resource?.seasons?.[0]?.name || '', records: hist.records || [], resource, fetchedAt: Date.now() };
}

/* ---------------------------------------------------------------- 小工具 */

const pad = (n) => String(n).padStart(2, '0');
const dt = (ts) => { const d = new Date(Number(ts) * 1000); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: pad(d.getHours()), mi: pad(d.getMinutes()) }; };
const fmtTime = (ts) => { const t = dt(ts); return `${t.m}-${t.d} ${t.h}:${t.mi}`; };
const fmtFull = (ts) => { const t = dt(ts); return `${t.y}-${pad(t.m)}-${pad(t.d)} ${t.h}:${t.mi}`; };
const durMin = (a, b) => Math.max(0, Math.round((Number(b) - Number(a)) / 60));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = (u) => (u ? esc(u) : '');
const avatarOf = (id) => state.idx.chars.get(id)?.avatarUrl || '';

function toast(msg, ms = 3600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------------------------------------------------------------- 渲染 */

function buildIndex(res) {
  const i = state.idx;
  i.chars.clear(); i.bonds.clear(); i.strategies.clear(); i.items.clear();
  (res?.chars || []).forEach((c) => i.chars.set(c.charId, c));
  (res?.bonds || []).forEach((b) => i.bonds.set(b.bondId, b));
  (res?.strategies || []).forEach((s) => i.strategies.set(s.strategyId, s));
  (res?.items || []).forEach((it) => i.items.set(it.itemId, it));
}

function renderAll() {
  const recs = state.data.records || [];
  const res = state.data.resource || {};
  const art = (res.image || [])[0] || {};

  if (art.logoPc) { const l = $('#logo'); l.src = art.logoPc; l.hidden = false; }
  if (art.backgroundPc) $('#heroBg').style.backgroundImage = `url("${art.backgroundPc}")`;

  const season = state.data.seasonName || res.seasons?.[0]?.name;
  const newest = recs[0] ? fmtFull(recs[0].gameStartTs) : '';
  $('#seasonLine').textContent = [season && `规程「${season}」`, `${recs.length} 条记录`, newest && `最近 ${newest}`].filter(Boolean).join(' · ');

  renderStats(recs);
  drawChart(recs, $('#chart'));
  drawWinChart(recs, $('#winChart'));
  renderOperators(recs);
  renderBandRates(recs);
  renderList();

  const when = new Date(state.data.fetchedAt);
  $('#updated').textContent = `更新于 ${pad(when.getMonth() + 1)}-${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

function renderStats(recs) {
  const n = recs.length;
  if (!n) return;
  const win = recs.filter((r) => Number(r.completeState) === 1).length;
  const asc = [...recs].sort((a, b) => Number(a.gameStartTs) - Number(b.gameStartTs));
  let best = 0, cur = 0;
  for (const r of asc) { if (Number(r.completeState) === 1) { cur++; best = Math.max(best, cur); } else cur = 0; }
  const kills = recs.reduce((s, r) => s + (Number(r.killCnt) || 0), 0);
  const rounds = recs.reduce((s, r) => s + (Number(r.passRound) || 0), 0);
  const trophyNow = Math.max(...recs.map((r) => Number(r.trophyAfter) || 0));
  const gain = trophyNow - (Number(asc[0]?.trophyBefore) || 0);

  $('#stats').innerHTML = `
    <div class="stat"><div class="k">总场次</div><div class="v">${n}</div></div>
    <div class="stat"><div class="k">成功率</div><div class="v">${Math.round((win / n) * 100)}<small>%</small></div></div>
    <div class="stat"><div class="k">最长连胜</div><div class="v">${best}</div></div>
    <div class="stat"><div class="k">场均击杀</div><div class="v">${Math.round(kills / n)}</div></div>
    <div class="stat"><div class="k">平均回合</div><div class="v">${(rounds / n).toFixed(1)}</div></div>
    <div class="stat gold"><div class="k">当前奖杯</div><div class="v">${trophyNow}<small>${gain >= 0 ? '+' : ''}${gain}</small></div></div>`;
}

function drawChart(recs, host) {
  if (!host || !recs.length) { if (host) host.innerHTML = ''; return; }
  const W = host.clientWidth || 700;
  const H = host.clientHeight || 200;
  const asc = [...recs].sort((a, b) => Number(a.gameStartTs) - Number(b.gameStartTs));
  const vals = asc.map((r) => Number(r.trophyAfter) || 0);
  const vmin = Math.min(...vals), vmax = Math.max(...vals);
  const span = Math.max(4, vmax - vmin);
  const lo = vmin - Math.round(span * 0.15), hi = vmax + Math.round(span * 0.15);
  const padL = 36, padR = 14, padT = 12, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i) => padL + (asc.length === 1 ? iw / 2 : (i / (asc.length - 1)) * iw);
  const y = (v) => padT + ih - ((v - lo) / (hi - lo || 1)) * ih;

  const pts = asc.map((r, i) => [x(i), y(Number(r.trophyAfter) || 0), Number(r.completeState) === 1]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${(padT + ih).toFixed(1)} L${pts[0][0].toFixed(1)},${(padT + ih).toFixed(1)} Z`;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    const yy = y(v);
    grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="rgba(255,255,255,.05)"/>
      <text x="${padL - 8}" y="${(yy + 3.5).toFixed(1)}" fill="#6f807c" font-size="10" text-anchor="end">${Math.round(v)}</text>`;
  }
  const dots = pts.map((p, i) => {
    const r = asc[i];
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p[2] ? 3.4 : 2.8}" fill="${p[2] ? '#2ee6b6' : '#5a6b68'}">
      <title>${fmtFull(r.gameStartTs)} · ${p[2] ? '成功' : '中断'} · ${r.trophyBefore}→${r.trophyAfter} 杯 · ${r.passRound} 回合</title></circle>`;
  }).join('');

  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2ee6b6" stop-opacity=".26"/><stop offset="100%" stop-color="#2ee6b6" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#ga)"/>
    <path d="${line}" fill="none" stroke="#2ee6b6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${padL}" y="${H - 8}" fill="#6f807c" font-size="10">${fmtTime(asc[0].gameStartTs)}</text>
    <text x="${W - padR}" y="${H - 8}" fill="#6f807c" font-size="10" text-anchor="end">${fmtTime(asc[asc.length - 1].gameStartTs)}</text>
  </svg>`;
}

function drawWinChart(recs, host) {
  if (!host || !recs.length) { if (host) host.innerHTML = ''; return; }
  const win = Number(state.winWindow) || 0;
  const W = host.clientWidth || 700;
  const H = host.clientHeight || 200;
  const asc = [...recs].sort((a, b) => Number(a.gameStartTs) - Number(b.gameStartTs));

  const pts = asc.map((r, i) => {
    const from = win > 0 ? Math.max(0, i - win + 1) : 0;
    const slice = asc.slice(from, i + 1);
    const w = slice.filter((x) => Number(x.completeState) === 1).length;
    return { i, rate: (w / slice.length) * 100, size: slice.length, win: Number(r.completeState) === 1, rec: r };
  });

  const padL = 34, padR = 34, padT = 10, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const x = (i) => padL + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
  const y = (v) => padT + ih - (v / 100) * ih;

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${x(0).toFixed(1)},${(padT + ih).toFixed(1)} Z`;

  let grid = '';
  for (const v of [0, 25, 50, 75, 100]) {
    const yy = y(v);
    grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="rgba(255,255,255,.05)"/>
      <text x="${padL - 6}" y="${(yy + 3.5).toFixed(1)}" fill="#6f807c" font-size="10" text-anchor="end">${v}%</text>`;
  }

  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.rate).toFixed(1)}" r="${p.win ? 3 : 2.4}"
      fill="${p.win ? '#2ee6b6' : '#5a6b68'}">
      <title>${fmtFull(p.rec.gameStartTs)} · 近${p.size}场胜率 ${p.rate.toFixed(0)}% · 本局${p.win ? '成功' : '中断'}</title></circle>`).join('');

  const last = pts[pts.length - 1];
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2ee6b6" stop-opacity=".22"/><stop offset="100%" stop-color="#2ee6b6" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <line x1="${padL}" y1="${y(50).toFixed(1)}" x2="${W - padR}" y2="${y(50).toFixed(1)}" stroke="rgba(240,198,107,.28)" stroke-dasharray="4 4"/>
    <path d="${area}" fill="url(#gw)"/>
    <path d="${line}" fill="none" stroke="#2ee6b6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${W - 4}" y="${(y(last.rate) - 6).toFixed(1)}" fill="#2ee6b6" font-size="11" text-anchor="end" font-weight="600">${last.rate.toFixed(0)}%</text>
    <text x="${padL}" y="${H - 6}" fill="#6f807c" font-size="10">${fmtTime(asc[0].gameStartTs)}</text>
    <text x="${W - padR}" y="${H - 6}" fill="#6f807c" font-size="10" text-anchor="end">${fmtTime(asc[asc.length - 1].gameStartTs)}</text>
  </svg>`;
}

function strategyStats(recs) {
  const map = new Map();
  for (const r of recs) {
    const id = r.bandId || 'unknown';
    const cur = map.get(id) || { id, games: 0, wins: 0 };
    cur.games++;
    if (Number(r.completeState) === 1) cur.wins++;
    map.set(id, cur);
  }
  return [...map.values()].sort((a, b) => b.games - a.games || b.wins - a.wins);
}

function renderBandRates(recs) {
  const all = strategyStats(recs);
  const pool = all.filter((s) => s.games >= 2);
  const list = (pool.length ? pool : all).slice(0, 8);
  const host = $('#bandRates');
  if (!host) return;
  const hint = $('#bandHint');
  if (hint) hint.textContent = pool.length ? `前 ${list.length} / ${all.length} 种` : `${all.length} 种策略`;
  host.innerHTML = list.map((s) => {
    const st = state.idx.strategies.get(s.id) || {};
    const rate = Math.round((s.wins / s.games) * 100);
    const tone = rate >= 60 ? 'good' : rate >= 40 ? 'mid' : 'bad';
    return `<div class="bar-row" title="${esc(st.name || s.id)} · ${s.wins} 胜 / ${s.games} 场">
      <div class="bar-name">${st.iconUrl ? `<img src="${esc(st.iconUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span>${esc(st.name || s.id)}</span></div>
      <div class="bar-track"><i class="${tone}" style="width:${Math.max(rate, 3)}%"></i></div>
      <div class="bar-val"><b>${rate}%</b><small>${s.wins}/${s.games}</small></div>
    </div>`;
  }).join('') || '<div class="muted small">暂无数据</div>';
}

function renderOperators(recs) {
  const cnt = new Map();
  for (const r of recs) for (const c of r.chessSquad || []) {
    const id = c.charId || c.chessInfo?.charId;
    if (id) cnt.set(id, (cnt.get(id) || 0) + 1);
  }
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  $('#opHint').textContent = `共 ${cnt.size} 名干员上场`;
  $('#operators').innerHTML = top.map(([id, n]) => {
    const c = state.idx.chars.get(id);
    return `<div class="op" title="${esc(c?.name || id)} · 上场 ${n} 次">
      ${c?.avatarUrl ? `<img src="${img(c.avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <span class="nm">${esc(c?.name || id)}</span><span class="ct">${n} 场</span></div>`;
  }).join('') || '<div class="muted small">暂无数据</div>';
}

function filtered() {
  const f = state.filter;
  return (state.data?.records || []).filter((r) => {
    if (f.result === 'win' && Number(r.completeState) !== 1) return false;
    if (f.result === 'lose' && Number(r.completeState) === 1) return false;
    if (f.mode !== 'all' && r.modeType !== f.mode) return false;
    if (f.diff !== 'all' && r.modeDifficulty !== f.diff) return false;
    return true;
  });
}

function renderList() {
  const recs = filtered();
  $('#count').textContent = `${recs.length} 场`;
  if (!recs.length) { $('#list').innerHTML = '<div class="muted" style="padding:20px;text-align:center">没有符合筛选条件的记录</div>'; return; }

  $('#list').innerHTML = recs.map((r, i) => {
    const win = Number(r.completeState) === 1;
    const band = state.idx.strategies.get(r.bandId);
    const delta = (Number(r.trophyAfter) || 0) - (Number(r.trophyBefore) || 0);
    const bonds = (r.bondInfo || []).filter((b) => b.activate).slice(0, 5).map((b) => {
      const info = state.idx.bonds.get(b.bondId);
      return `<span class="chip">${info?.iconUrl ? `<img src="${img(info.iconUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}${esc(info?.name || b.bondId)} ${b.layer} 层</span>`;
    }).join('');
    const squad = (r.chessSquad || []).map((c) => {
      const a = avatarOf(c.charId);
      const nm = c.chessInfo?.charName || c.charId;
      return a ? `<img src="${img(a)}" alt="${esc(nm)}" title="${esc(nm)}" loading="lazy" referrerpolicy="no-referrer">` : '';
    }).join('');
    return `<article class="rec" data-i="${i}">
      <div class="left">
        <div class="badges">
          <span class="tag ${win ? 'win' : 'lose'}">${win ? '模拟成功' : '模拟中断'}</span>
          <span class="tag diff">${esc(DIFF[r.modeDifficulty] || r.modeDifficulty || '—')}</span>
          <span class="tag mode">${esc(MODE[r.modeType] || r.modeType || '—')}</span>
        </div>
        <div class="time">${fmtTime(r.gameStartTs)} · ${durMin(r.gameStartTs, r.gameEndTs)} 分钟</div>
      </div>
      <div class="mid">
        <div class="kpis">
          <span class="kpi">回合 <b>${r.passRound}</b></span>
          <span class="kpi">击杀 <b>${r.killCnt}</b></span>
          <span class="kpi">奖杯 <b>${r.trophyBefore}→${r.trophyAfter}</b>${delta ? ` <b class="${delta > 0 ? 'up' : ''}">${delta > 0 ? '+' : ''}${delta}</b>` : ''}</span>
          ${band ? `<span class="kpi">策略 <b>${esc(band.name || '')}</b></span>` : ''}
        </div>
        <div class="chips">${bonds || '<span class="muted small">无激活盟约</span>'}</div>
        <div class="squad">${squad}</div>
      </div>
      <div class="right"><span>详情</span><span class="arrow">›</span></div>
    </article>`;
  }).join('');

  $$('.rec', $('#list')).forEach((el) => el.addEventListener('click', () => openDetail(recs[Number(el.dataset.i)])));
}

function openDetail(r) {
  const win = Number(r.completeState) === 1;
  const band = state.idx.strategies.get(r.bandId);
  const bonds = (r.bondInfo || []).map((b) => {
    const info = state.idx.bonds.get(b.bondId);
    return `<span class="chip ${b.activate ? '' : 'off'}">${info?.iconUrl ? `<img src="${img(info.iconUrl)}" alt="" referrerpolicy="no-referrer">` : ''}${esc(info?.name || b.bondId)} ${b.layer} 层</span>`;
  }).join('');

  const ops = (r.chessSquad || []).map((c) => {
    const ch = state.idx.chars.get(c.charId);
    const info = c.chessInfo || {};
    const skillId = String(c.skillId || '').replace(/\[.*\]$/, '');
    const skill = (ch?.skills || []).find((s) => s.skillId === skillId)?.name || '';
    const eqs = (c.equips || []).map((e) => {
      const it = state.idx.items.get(e.equipId);
      return `<span class="eq">${it?.iconUrl ? `<img src="${img(it.iconUrl)}" alt="" referrerpolicy="no-referrer">` : ''}${esc(it?.name || e.equipId)}</span>`;
    }).join('');
    return `<div class="m-op">
      ${ch?.avatarUrl ? `<img src="${img(ch.avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <div class="info">
        <div class="nm">${esc(info.charName || ch?.name || c.charId)}</div>
        <div class="meta">${esc(PROF[info.charProfession] || '')} · 精英${info.evolvePhase ?? '?'} Lv${info.charLevel ?? '?'}${info.mergeLevel ? ` · 合并 ${info.mergeLevel}` : ''}</div>
        <div class="meta">${esc(skill)}</div>
        <div>${eqs}</div>
      </div></div>`;
  }).join('');

  const bosses = (r.acBossInfo || []).map((b) => `<span class="chip ${b.isKilled ? '' : 'off'}">${esc(b.bossId)}${b.isHidden ? '（隐藏）' : ''} · ${b.isKilled ? '已击杀' : '未击杀'}</span>`).join('');

  $('#modalCard').innerHTML = `
    <div class="m-head">
      <div>
        <div class="m-title">${fmtFull(r.gameStartTs)} <span class="tag ${win ? 'win' : 'lose'}">${win ? '模拟成功' : '模拟中断'}</span></div>
        <div class="muted small" style="margin-top:6px">
          ${esc(DIFF[r.modeDifficulty] || r.modeDifficulty || '')} · ${esc(MODE[r.modeType] || r.modeType || '')} · ${durMin(r.gameStartTs, r.gameEndTs)} 分钟 · ${r.passRound} 回合 · 击杀 ${r.killCnt} · 奖杯 ${r.trophyBefore}→${r.trophyAfter} · 金币 ${r.coinCost ?? '?'}${band ? ` · 策略「${esc(band.name || '')}」` : ''}
        </div>
      </div>
      <button class="m-close" id="mClose">×</button>
    </div>
    <div class="m-sec"><h4>激活盟约</h4><div class="chips">${bonds || '<span class="muted small">无</span>'}</div></div>
    <div class="m-sec"><h4>干员阵容（${(r.chessSquad || []).length}）</h4><div class="m-grid">${ops || '<span class="muted small">无</span>'}</div></div>
    ${bosses ? `<div class="m-sec"><h4>首领</h4><div class="chips">${bosses}</div></div>` : ''}
    <div class="m-sec muted small">记录 ${esc(r.id)} · 场景 ${esc(r.sceneId)} · 版本 ${esc(r.versionId || '')}</div>`;
  $('#modal').hidden = false;
  $('#mClose').addEventListener('click', closeDetail);
}
const closeDetail = () => { $('#modal').hidden = true; };

/* ---------------------------------------------------------------- 流程 */

function showGate(on) {
  $('#gate').hidden = !on;
  $('#content').hidden = on;
}

async function refresh(force = false) {
  if (state.busy) return;
  state.busy = true;
  const btn = $('#btn-refresh');
  const label = btn.textContent;
  btn.innerHTML = '<span class="spin"></span>读取中';
  try {
    const data = await fetchAll();
    state.data = data;
    try { localStorage.setItem(STORE_CACHE, JSON.stringify(data)); } catch { }
    buildIndex(data.resource);
    showGate(false);
    renderAll();
    $('#btn-refresh').disabled = false;
    $('#btn-export').disabled = false;
    $('#btn-account').hidden = false;
    if (force) toast(`已更新，共 ${data.records.length} 条战绩`);
  } catch (e) {
    const code = e.code;
    if (code === 10002 || code === 10001) {
      toast(e.message + '（凭据可能已过期，请重新获取）', 7000);
    } else if (code === 'NO_BINDING') {
      toast(e.message, 8000);
    } else {
      toast('读取失败：' + e.message, 7000);
    }
  } finally {
    state.busy = false;
    btn.textContent = label;
    btn.disabled = false;
  }
}

function boot() {
  // 1) 书签带回的凭据
  const fromHash = credsFromHash();
  if (fromHash) {
    saveCreds(fromHash);
    history.replaceState(null, '', location.pathname + location.search);
  }
  creds = creds || loadCreds();

  // 2) 缓存先渲染
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(STORE_CACHE) || 'null'); } catch { }
  if (!creds) { showGate(true); return; }

  if (cached?.records?.length) {
    state.data = cached;
    buildIndex(cached.resource);
    showGate(false);
    renderAll();
    $('#btn-refresh').disabled = false;
    $('#btn-export').disabled = false;
    $('#btn-account').hidden = false;
    const stale = Date.now() - (cached.fetchedAt || 0) > CACHE_TTL;
    if (stale || fromHash) refresh(false);
  } else {
    refresh(false);
  }
}

/* ---------------------------------------------------------------- 书签 */

function buildBookmarklet() {
  const target = location.origin + location.pathname;
  const code = `(function(){var g=function(k){try{return localStorage.getItem(k)||''}catch(e){return ''}};var d='';try{d=(JSON.parse(g('SK_SHUMEI_DEVICE_ID_KEY')||'{}')||{}).id||''}catch(e){};var p=new URLSearchParams({k:g('SK_OAUTH_CRED_KEY'),t:g('SK_TOKEN_CACHE_KEY'),d:d});var u='${target}#'+p.toString();var w=window.open(u,'_blank');if(!w)location.href=u})()`;
  return 'javascript:' + encodeURIComponent(code);
}

/* ---------------------------------------------------------------- 事件 */

$('#btn-refresh').addEventListener('click', () => refresh(true));
$('#btn-account').addEventListener('click', () => {
  if (!confirm('清除本机保存的凭据与缓存？')) return;
  clearCreds();
  state.data = null;
  $('#stats').innerHTML = '';
  $('#chart').innerHTML = '';
  $('#winChart').innerHTML = '';
  $('#bandRates').innerHTML = '';
  $('#operators').innerHTML = '';
  $('#list').innerHTML = '';
  $('#btn-refresh').disabled = true;
  $('#btn-export').disabled = true;
  $('#btn-account').hidden = true;
  $('#updated').textContent = '';
  showGate(true);
  toast('已清除');
});
$('#btn-export').addEventListener('click', () => {
  if (!state.data) return;
  const blob = new Blob([JSON.stringify({ season: state.data.season, fetchedAt: new Date(state.data.fetchedAt).toISOString(), records: state.data.records }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stronghold-${state.data.season || 'records'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#btn-copy-bm').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(buildBookmarklet()); toast('书签代码已复制，新建书签把网址粘贴进去即可'); }
  catch { toast('复制失败，请手动长按拖拽书签'); }
});

$('#btn-paste').addEventListener('click', () => {
  const raw = $('#pasteBox').value.trim();
  if (!raw) return toast('先粘贴内容');
  let obj = null;
  try { obj = JSON.parse(raw); } catch {
    const p = new URLSearchParams(raw.replace(/^#/, ''));
    if (p.get('k')) obj = { k: p.get('k'), t: p.get('t'), d: p.get('d') };
  }
  if (!obj?.k || !obj?.t) return toast('格式不对，需要包含 k / t / d 三个字段');
  saveCreds({ k: obj.k, t: obj.t, d: obj.d || '' });
  toast('凭据已保存，正在读取…');
  refresh(true);
});

$$('.seg[data-filter]').forEach((seg) => {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
    state.filter[seg.dataset.filter] = b.dataset.v;
    renderList();
  });
});

$('#winSeg')?.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('button', $('#winSeg')).forEach((x) => x.classList.toggle('on', x === b));
  state.winWindow = Number(b.dataset.w) || 0;
  if (state.data) drawWinChart(state.data.records, $('#winChart'));
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

let rz;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    if (!state.data) return;
    drawChart(state.data.records, $('#chart'));
    drawWinChart(state.data.records, $('#winChart'));
  }, 200);
});

const bm = $('#bm');
bm.href = buildBookmarklet();

boot();
