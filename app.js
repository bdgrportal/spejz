// ============================================================
//  Spejz - fő alkalmazás
//  Egyszerű, nagybetűs, mobilra tervezett bevásárló app.
// ============================================================

import { sb, LS, ensureSession, createHousehold, joinHousehold, myHouseholds, loadAll, T, finishTrip } from './db.js';
import { CATEGORIES, LOCATIONS } from './config.js';
import { ICON } from './icons.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

const S = {
  user: null,
  hh: null, hhName: '', inviteCode: '',
  stores: [], items: [], list: [], inventory: [], trips: [], checklist: [], members: [],
  view: 'list',
  filter: 'all',
  invLoc: 'Mind',
  trip: null,
  modal: null,
  draft: '',
  showDone: false
};

/* ---------------- segédek ---------------- */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const huf = n => new Intl.NumberFormat('hu-HU').format(Math.round(Number(n) || 0)) + ' Ft';
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = d => String(d).slice(0, 7);

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

function storeById(id) { return S.stores.find(s => s.id === id) || null; }
function storeName(id) { const s = storeById(id); return s ? s.name : 'Globál'; }
function memberName(uid) {
  const m = S.members.find(x => x.user_id === uid);
  return m?.display_name || 'valaki';
}

async function guard(fn, okMsg) {
  try {
    await fn();
    if (okMsg) toast(okMsg);
  } catch (e) {
    console.error(e);
    toast('Hiba: ' + (e.message || 'nem sikerült'));
  }
}

async function refresh() {
  const d = await loadAll(S.hh);
  Object.assign(S, d);
  render();
}

/* ---------------- indulás ---------------- */

async function boot() {
  try {
    S.user = await ensureSession();
  } catch (e) {
    app.innerHTML = `<div class="gate"><div class="gate-inner">
      <div class="logo">${ICON.basket}<span class="wm">Spejz</span></div>
      <p class="lead">Nem sikerült csatlakozni a szerverhez. Ellenőrizd a <code>js/config.js</code> beállításait,
      és hogy a Supabase-ben be van-e kapcsolva a névtelen belépés (Anonymous sign-ins).</p>
      <div class="card" style="color:#0B2E20"><b>Részletek:</b><br>${esc(e.message)}</div>
    </div></div>`;
    return;
  }

  const hhs = await myHouseholds().catch(() => []);
  if (!hhs.length) { renderGate(); return; }

  const saved = LS.hh && hhs.find(h => h.household_id === LS.hh);
  const chosen = saved || hhs[0];
  S.hh = chosen.household_id;
  S.hhName = chosen.households.name;
  S.inviteCode = chosen.households.invite_code;
  LS.hh = S.hh;
  LS.code = S.inviteCode;
  if (chosen.display_name) LS.name = chosen.display_name;

  await refresh();
}

/* ---------------- belépő képernyő ---------------- */

function renderGate(mode = 'start') {
  const name = esc(LS.name);
  let body = '';

  if (mode === 'start') {
    body = `
      <div class="field">
        <label for="g-name">Hogy hívjunk?</label>
        <input class="input" id="g-name" placeholder="pl. Anya" value="${name}" autocomplete="name">
      </div>
      <div class="btn-row" style="flex-direction:column">
        <button class="btn lemon block" data-act="gate-mode" data-mode="join">Csatlakozom kóddal</button>
        <button class="btn ghost block" data-act="gate-mode" data-mode="create">Új Spejz indítása</button>
      </div>
      <p class="hint">Nincs regisztráció, nincs jelszó. A család egy 6 jegyű kóddal lép be ugyanabba a Spejzbe.</p>`;
  } else if (mode === 'join') {
    body = `
      <div class="field">
        <label for="g-name">A neved</label>
        <input class="input" id="g-name" placeholder="pl. Apa" value="${name}">
      </div>
      <div class="field">
        <label for="g-code">Meghívó kód</label>
        <input class="input" id="g-code" placeholder="pl. K7F2QA" style="text-transform:uppercase;letter-spacing:4px" value="${esc(LS.code)}">
      </div>
      <button class="btn lemon block" data-act="gate-join">Belépek</button>
      <button class="btn ghost block" style="margin-top:10px" data-act="gate-mode" data-mode="start">Vissza</button>`;
  } else {
    body = `
      <div class="field">
        <label for="g-name">A neved</label>
        <input class="input" id="g-name" placeholder="pl. Anya" value="${name}">
      </div>
      <div class="field">
        <label for="g-hh">A Spejz neve</label>
        <input class="input" id="g-hh" placeholder="pl. Kovács család" value="Otthon">
      </div>
      <button class="btn lemon block" data-act="gate-create">Létrehozom</button>
      <button class="btn ghost block" style="margin-top:10px" data-act="gate-mode" data-mode="start">Vissza</button>`;
  }

  app.innerHTML = `
    <div class="gate"><div class="gate-inner">
      <div class="logo">${ICON.basket}<span class="wm">Spejz</span></div>
      <p class="lead">Bevásárlólista, leltár és költés. Egy helyen, az egész családnak.</p>
      ${body}
    </div></div>`;
}

/* ---------------- fő váz ---------------- */

function render() {
  if (!S.hh) { renderGate(); return; }

  const views = {
    list: viewList,
    shop: viewShop,
    inventory: viewInventory,
    spend: viewSpend,
    settings: viewSettings
  };

  app.innerHTML = `
    <header class="topbar">
      <div class="brand">${ICON.basket}<span class="wm">Spejz</span></div>
      <div class="spacer"></div>
      <div class="hh-chip">${esc(S.hhName)}</div>
    </header>
    <main class="main">${views[S.view]()}</main>
    <nav class="tabbar">
      ${tab('list', 'Lista', ICON.list)}
      ${tab('shop', 'Vásárlás', ICON.cart)}
      ${tab('inventory', 'Leltár', ICON.box)}
      ${tab('spend', 'Költés', ICON.wallet)}
      ${tab('settings', 'Beállítás', ICON.cog)}
    </nav>
    ${S.modal ? S.modal() : ''}`;

  const qa = document.getElementById('qa-input');
  if (qa && S.draft !== null && document.activeElement !== qa) qa.value = S.draft;
}

const tab = (id, label, icon) => `
  <button class="tab" data-act="view" data-view="${id}" aria-current="${S.view === id}">
    <span class="ico">${icon}</span><span>${label}</span>
  </button>`;

/* ---------------- 1. LISTA ---------------- */

function pending() { return S.list.filter(i => !i.done); }

function viewList() {
  const open = pending();
  const done = S.list.filter(i => i.done);

  const chips = [
    `<button class="chip" data-act="filter" data-v="all" aria-pressed="${S.filter === 'all'}">Mind <span class="count">${open.length}</span></button>`,
    `<button class="chip" data-act="filter" data-v="global" aria-pressed="${S.filter === 'global'}">Globál <span class="count">${open.filter(i => !i.store_id).length}</span></button>`,
    ...S.stores.map(s => {
      const c = open.filter(i => i.store_id === s.id).length;
      return `<button class="chip" data-act="filter" data-v="${s.id}" aria-pressed="${S.filter === s.id}">
        <span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)} <span class="count">${c}</span></button>`;
    })
  ].join('');

  let groups = [];
  if (S.filter === 'all') {
    groups.push(['Globál', open.filter(i => !i.store_id)]);
    S.stores.forEach(s => groups.push([s.name, open.filter(i => i.store_id === s.id)]));
  } else if (S.filter === 'global') {
    groups.push(['Globál', open.filter(i => !i.store_id)]);
  } else {
    groups.push([storeName(S.filter), open.filter(i => i.store_id === S.filter)]);
  }
  groups = groups.filter(g => g[1].length);

  const onList = new Set(S.list.map(i => i.name.toLowerCase()));
  const suggests = S.items
    .filter(i => i.times_bought > 0 && !onList.has(i.name.toLowerCase()))
    .slice(0, 8)
    .map(i => `<button class="suggest" data-act="quick-suggest" data-name="${esc(i.name)}" data-store="${i.default_store_id || ''}">+ ${esc(i.name)}</button>`)
    .join('');

  return `
    <h1 class="view-title">Bevásárlólista</h1>

    <div class="card">
      <form class="quickadd" data-act="quick-add">
        <input class="input" id="qa-input" name="qa" placeholder="Mit kell venni?" autocomplete="off" enterkeyhint="done">
        <button class="btn lemon" type="submit" aria-label="Hozzáadás">${ICON.plus}</button>
      </form>
      ${suggests ? `<div class="suggests">${suggests}</div>` : ''}
    </div>

    <div class="chips">${chips}</div>

    ${groups.length ? groups.map(([title, rows]) => `
      <div class="section-label">${esc(title)} <span style="opacity:.6">(${rows.length})</span></div>
      <div class="card tight"><div class="rows">${rows.map(i => listRow(i)).join('')}</div></div>
    `).join('') : `
      <div class="empty"><div class="big">${S.list.length ? '🎉' : '🧺'}</div>
        <b>${S.list.length ? 'Minden megvan!' : 'Üres a lista'}</b><br>
        Írd be fent, mit kell venni.</div>`}

    ${done.length ? `
      <button class="btn ghost block" data-act="toggle-done" style="margin-top:8px">
        ${S.showDone ? 'Megvett tételek elrejtése' : `Megvéve (${done.length})`}
      </button>
      ${S.showDone ? `<div class="card tight" style="margin-top:10px"><div class="rows">${done.map(i => listRow(i, true)).join('')}</div></div>
        <button class="btn danger block" data-act="clear-done">Megvettek törlése a listáról</button>` : ''}
    ` : ''}`;
}

function listRow(i, showStore = false) {
  const s = storeById(i.store_id);
  const meta = [];
  if (i.qty) meta.push(esc(i.qty));
  if (showStore) {
    meta.push(s
      ? `<span class="tag"><span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)}</span>`
      : `<span class="tag">Globál</span>`);
  }
  if (i.note) meta.push(esc(i.note));
  if (i.private_to) meta.push('csak nekem');
  return `
    <div class="row ${i.done ? 'done' : ''}">
      <button class="tick" data-act="toggle" data-id="${i.id}" aria-label="Kipipálás">${ICON.check}</button>
      <div class="body" data-act="edit-item" data-id="${i.id}">
        <div class="name">${esc(i.name)}</div>
        ${meta.length ? `<div class="meta">${meta.join('<span>·</span>')}</div>` : ''}
      </div>
      <button class="icon-btn" data-act="edit-item" data-id="${i.id}" aria-label="Szerkesztés">${ICON.pencil}</button>
    </div>`;
}

async function addToList(name, storeId, qty, note) {
  name = (name || '').trim();
  if (!name) return;
  const existing = S.items.find(i => i.name.toLowerCase() === name.toLowerCase());
  let store = storeId ?? null;
  if (store === null && existing?.default_store_id) store = existing.default_store_id;

  let itemId = existing?.id || null;
  if (!existing) {
    const { data } = await T.insert('items', {
      household_id: S.hh, name, default_store_id: store, created_by: S.user.id
    });
    itemId = data?.id || null;
  }
  await T.insert('list_items', {
    household_id: S.hh, item_id: itemId, name, store_id: store,
    qty: qty || null, note: note || null, added_by: S.user.id
  });
  await refresh();
}

/* ---------------- 2. VÁSÁRLÁS ---------------- */

function viewShop() {
  if (!S.trip) {
    const open = pending();
    return `
      <h1 class="view-title">Vásárlás</h1>
      <p style="color:var(--ink-soft);margin-top:-6px">Válaszd ki, hova mész. Utána összepakolunk, aztán jöhet a lista.</p>
      <div class="store-grid">
        ${S.stores.map(s => {
          const n = open.filter(i => i.store_id === s.id).length;
          return `<button class="store-btn" data-act="trip-start" data-id="${s.id}">
            <span class="dot" style="background:${esc(s.color)}"></span>
            ${esc(s.name)}<small>${n} tétel + globál</small></button>`;
        }).join('')}
      </div>`;
  }

  const s = storeById(S.trip.storeId);
  const stepBar = `<div class="steps">
    <i class="step on"></i><i class="step ${S.trip.step === 'shop' ? 'on' : ''}"></i></div>`;

  if (S.trip.step === 'pack') {
    const checks = S.checklist.filter(c => !c.store_id || c.store_id === S.trip.storeId);
    return `
      <button class="btn ghost sm" data-act="trip-cancel">${ICON.back} Vissza</button>
      <h1 class="view-title" style="margin-top:12px">Összepakolás - ${esc(s?.name || '')}</h1>
      ${stepBar}
      ${checks.length ? `<div class="card tight"><div class="rows">
        ${checks.map(c => `
          <div class="row ${S.trip.checks[c.id] ? 'done' : ''}">
            <button class="tick" data-act="pack-toggle" data-id="${c.id}" aria-label="Kipipálás">${ICON.check}</button>
            <div class="body"><div class="name">${esc(c.label)}</div></div>
          </div>`).join('')}
      </div></div>` : `<div class="empty">Nincs checklist tétel. A Beállításoknál tudsz felvenni.</div>`}
      <button class="btn primary block" data-act="trip-go">Mehet, vásárolok</button>`;
  }

  const rows = pending().filter(i => i.store_id === S.trip.storeId || !i.store_id);
  const left = rows.filter(i => !i.done).length;
  return `
    <button class="btn ghost sm" data-act="trip-cancel">${ICON.back} Megszakítás</button>
    <h1 class="view-title" style="margin-top:12px">${esc(s?.name || '')}</h1>
    ${stepBar}
    <div class="card" style="display:flex;align-items:center;justify-content:space-between">
      <div class="stat"><span class="num">${rows.length - left}</span><span class="unit">/ ${rows.length} kosárban</span></div>
    </div>
    ${rows.length ? `<div class="card tight"><div class="rows">${rows.map(i => listRow(i, true)).join('')}</div></div>`
      : `<div class="empty"><div class="big">🧺</div>Ehhez a bolthoz nincs tétel.</div>`}
    <button class="btn lemon block" data-act="trip-finish">Lezárás és költés rögzítése</button>`;
}

/* ---------------- 3. LELTÁR ---------------- */

function viewInventory() {
  const locs = ['Mind', ...LOCATIONS];
  const rows = S.inventory.filter(x => S.invLoc === 'Mind' || x.location === S.invLoc);
  const missing = S.inventory.filter(x => !x.in_stock).length;

  return `
    <h1 class="view-title">Otthoni leltár</h1>
    <div class="chips">
      ${locs.map(l => `<button class="chip" data-act="inv-loc" data-v="${esc(l)}" aria-pressed="${S.invLoc === l}">${esc(l)}</button>`).join('')}
    </div>
    ${missing ? `<div class="card" style="display:flex;gap:12px;align-items:center;justify-content:space-between">
      <div><b>${missing} dolog fogyott el</b><div style="color:var(--ink-soft);font-size:15px">Tedd fel egy gombbal a listára.</div></div>
      <button class="btn lemon sm" data-act="inv-to-list">Listára</button></div>` : ''}

    <div class="card tight"><div class="rows">
      ${rows.length ? rows.map(x => `
        <div class="row">
          <div class="body">
            <div class="name">${esc(x.name)}</div>
            <div class="meta">${esc(x.location)}</div>
          </div>
          <div class="switch">
            <button data-act="inv-set" data-id="${x.id}" data-v="1" aria-pressed="${x.in_stock}">van</button>
            <button class="no" data-act="inv-set" data-id="${x.id}" data-v="0" aria-pressed="${!x.in_stock}">nincs</button>
          </div>
          <button class="icon-btn" data-act="inv-del" data-id="${x.id}" aria-label="Törlés">${ICON.trash}</button>
        </div>`).join('')
        : `<div class="empty">Még üres a leltár.</div>`}
    </div></div>

    <div class="card">
      <form class="quickadd" data-act="inv-add">
        <input class="input" name="name" placeholder="Új tétel a leltárba" autocomplete="off">
        <button class="btn lemon" type="submit" aria-label="Hozzáadás">${ICON.plus}</button>
      </form>
      <div class="field" style="margin-top:10px">
        <label for="inv-loc-sel">Hova kerüljön?</label>
        <select class="input" id="inv-loc-sel">
          ${LOCATIONS.map(l => `<option ${((S.invLoc === l) ? 'selected' : '')}>${esc(l)}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

/* ---------------- 4. KÖLTÉS ---------------- */

function viewSpend() {
  const thisM = monthKey(today());
  const cur = S.trips.filter(t => monthKey(t.spent_at) === thisM);
  const total = cur.reduce((a, t) => a + Number(t.amount), 0);

  const byStore = {};
  cur.forEach(t => {
    const k = t.store_name || storeName(t.store_id);
    byStore[k] = (byStore[k] || 0) + Number(t.amount);
  });
  const max = Math.max(1, ...Object.values(byStore));

  const prevM = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const prev = S.trips.filter(t => monthKey(t.spent_at) === prevM).reduce((a, t) => a + Number(t.amount), 0);

  return `
    <h1 class="view-title">Költés</h1>
    <div class="cols">
      <div class="card">
        <div class="section-label" style="margin:0 0 6px">Ebben a hónapban</div>
        <div class="stat"><span class="num">${huf(total)}</span></div>
        <div style="color:var(--ink-soft);font-size:15px;margin-top:4px">
          ${cur.length} vásárlás · előző hónap: ${huf(prev)}
        </div>
        ${Object.keys(byStore).length ? `<div class="bars">
          ${Object.entries(byStore).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
            <div class="bar-row"><span>${esc(k)}</span>
              <span class="bar"><i style="width:${Math.round(v / max * 100)}%"></i></span>
              <b>${huf(v)}</b></div>`).join('')}
        </div>` : ''}
      </div>
      <div class="card">
        <button class="btn primary block" data-act="spend-add">Költés rögzítése</button>
        <p style="color:var(--ink-soft);font-size:15px;margin:12px 0 0">
          Vásárlás lezárásakor automatikusan ide kerül az összeg.</p>
      </div>
    </div>

    <div class="section-label">Vásárlások</div>
    <div class="card tight"><div class="rows">
      ${S.trips.length ? S.trips.slice(0, 60).map(t => `
        <div class="row">
          <div class="body">
            <div class="name">${huf(t.amount)}</div>
            <div class="meta">${esc(t.spent_at)} · ${esc(t.store_name || storeName(t.store_id))}${t.note ? ' · ' + esc(t.note) : ''} · ${esc(memberName(t.paid_by))}</div>
          </div>
          <button class="icon-btn" data-act="trip-del" data-id="${t.id}" aria-label="Törlés">${ICON.trash}</button>
        </div>`).join('') : `<div class="empty">Még nincs rögzített vásárlás.</div>`}
    </div></div>`;
}

/* ---------------- 5. BEÁLLÍTÁSOK ---------------- */

function viewSettings() {
  return `
    <h1 class="view-title">Beállítások</h1>

    <div class="card">
      <div class="section-label" style="margin:0 0 8px">Meghívó kód a családnak</div>
      <div class="code-big">${esc(S.inviteCode)}</div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn sm" data-act="copy-code">${ICON.copy} Kód másolása</button>
        <button class="btn sm" data-act="share-code">Megosztás</button>
      </div>
      <p style="color:var(--ink-soft);font-size:15px">A másik telefonon nyissák meg ugyanezt a linket, és írják be ezt a kódot.</p>
    </div>

    <div class="card">
      <div class="section-label" style="margin:0 0 8px">Alapok</div>
      <div class="field"><label for="set-hh">Spejz neve</label>
        <input class="input" id="set-hh" value="${esc(S.hhName)}"></div>
      <div class="field"><label for="set-name">A te neved</label>
        <input class="input" id="set-name" value="${esc(LS.name)}"></div>
      <button class="btn primary block" data-act="save-basics">Mentés</button>
    </div>

    <div class="card">
      <div class="section-label" style="margin:0 0 8px">Boltok</div>
      <div class="rows">
        ${S.stores.map(s => `
          <div class="row">
            <span class="dot" style="width:16px;height:16px;border-radius:50%;background:${esc(s.color)}"></span>
            <div class="body"><div class="name">${esc(s.name)}</div></div>
            <button class="icon-btn" data-act="store-ren" data-id="${s.id}" aria-label="Átnevezés">${ICON.pencil}</button>
            <button class="icon-btn" data-act="store-del" data-id="${s.id}" aria-label="Törlés">${ICON.trash}</button>
          </div>`).join('')}
      </div>
      <form class="quickadd" data-act="store-add" style="margin-top:10px">
        <input class="input" name="name" placeholder="Új bolt neve" autocomplete="off">
        <button class="btn lemon" type="submit" aria-label="Hozzáadás">${ICON.plus}</button>
      </form>
    </div>

    <div class="card">
      <div class="section-label" style="margin:0 0 8px">Összepakolós checklist</div>
      <div class="rows">
        ${S.checklist.map(c => `
          <div class="row">
            <div class="body"><div class="name">${esc(c.label)}</div>
              <div class="meta">${c.store_id ? esc(storeName(c.store_id)) : 'minden boltnál'}</div></div>
            <button class="icon-btn" data-act="check-del" data-id="${c.id}" aria-label="Törlés">${ICON.trash}</button>
          </div>`).join('')}
      </div>
      <form class="quickadd" data-act="check-add" style="margin-top:10px">
        <input class="input" name="label" placeholder="Új checklist tétel" autocomplete="off">
        <button class="btn lemon" type="submit" aria-label="Hozzáadás">${ICON.plus}</button>
      </form>
      <div class="field" style="margin-top:10px">
        <label for="check-store">Melyik boltnál kell?</label>
        <select class="input" id="check-store">
          <option value="">Mindegyiknél</option>
          ${S.stores.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="card">
      <div class="section-label" style="margin:0 0 8px">Tagok</div>
      <div class="rows">
        ${S.members.map(m => `<div class="row"><div class="body"><div class="name">${esc(m.display_name || 'Névtelen')}</div>
          <div class="meta">${m.user_id === S.user.id ? 'te' : esc(m.role)}</div></div></div>`).join('')}
      </div>
    </div>

    <button class="btn danger block" data-act="leave">Kilépés ebből a Spejzből</button>
    <p style="color:var(--ink-soft);font-size:14px;text-align:center">A kóddal bármikor vissza tudsz lépni.</p>`;
}

/* ---------------- modálok ---------------- */

function openModal(html) {
  S.modal = () => `<div class="modal-bg" data-act="modal-bg"><div class="modal">${html}</div></div>`;
  render();
}
function closeModal() { S.modal = null; render(); }

function editItemModal(id) {
  const i = S.list.find(x => x.id === id);
  if (!i) return;
  openModal(`
    <h3>Tétel szerkesztése</h3>
    <div class="field"><label for="m-name">Név</label><input class="input" id="m-name" value="${esc(i.name)}"></div>
    <div class="field"><label for="m-qty">Mennyiség</label><input class="input" id="m-qty" placeholder="pl. 2 kg" value="${esc(i.qty || '')}"></div>
    <div class="field"><label for="m-store">Bolt</label>
      <select class="input" id="m-store">
        <option value="">Globál (mindegy hol)</option>
        ${S.stores.map(s => `<option value="${s.id}" ${s.id === i.store_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
      </select></div>
    <div class="field"><label for="m-note">Megjegyzés</label><input class="input" id="m-note" value="${esc(i.note || '')}"></div>
    <div class="btn-row">
      <button class="btn primary" data-act="item-save" data-id="${id}">Mentés</button>
      <button class="btn ghost" data-act="modal-close">Mégsem</button>
      <button class="btn danger" data-act="item-del" data-id="${id}">Törlés</button>
    </div>`);
}

function finishTripModal() {
  const s = storeById(S.trip.storeId);
  openModal(`
    <h3>${esc(s?.name || '')} - mennyi lett?</h3>
    <div class="field"><label for="f-amount">Fizetett összeg (Ft)</label>
      <input class="input" id="f-amount" type="number" inputmode="decimal" placeholder="0"></div>
    <div class="field"><label for="f-date">Dátum</label>
      <input class="input" id="f-date" type="date" value="${today()}"></div>
    <div class="field"><label for="f-note">Megjegyzés</label><input class="input" id="f-note" placeholder="opcionális"></div>
    <p style="color:var(--ink-soft);font-size:15px">A kipipált tételek lekerülnek a listáról, és beszámítanak a szokásaidba.</p>
    <div class="btn-row">
      <button class="btn lemon" data-act="trip-save">Kész, mehet</button>
      <button class="btn ghost" data-act="modal-close">Mégsem</button>
    </div>`);
}

function spendModal() {
  openModal(`
    <h3>Költés rögzítése</h3>
    <div class="field"><label for="s-amount">Összeg (Ft)</label>
      <input class="input" id="s-amount" type="number" inputmode="decimal" placeholder="0"></div>
    <div class="field"><label for="s-store">Bolt</label>
      <select class="input" id="s-store">${S.stores.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="s-date">Dátum</label><input class="input" id="s-date" type="date" value="${today()}"></div>
    <div class="field"><label for="s-note">Megjegyzés</label><input class="input" id="s-note"></div>
    <div class="btn-row">
      <button class="btn primary" data-act="spend-save">Mentés</button>
      <button class="btn ghost" data-act="modal-close">Mégsem</button>
    </div>`);
}

/* ---------------- események ---------------- */

const val = id => (document.getElementById(id)?.value || '').trim();

document.addEventListener('submit', async ev => {
  const form = ev.target.closest('[data-act]');
  if (!form) return;
  ev.preventDefault();
  const act = form.dataset.act;
  const fd = new FormData(form);

  if (act === 'quick-add') {
    const name = String(fd.get('qa') || '').trim();
    if (!name) return;
    S.draft = '';
    const store = (S.filter === 'all' || S.filter === 'global') ? null : S.filter;
    await guard(() => addToList(name, store));
  }
  if (act === 'inv-add') {
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    const loc = val('inv-loc-sel') || 'Kamra';
    await guard(async () => {
      await T.insert('inventory', { household_id: S.hh, name, location: loc, in_stock: true });
      await refresh();
    });
  }
  if (act === 'store-add') {
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    await guard(async () => {
      await T.insert('stores', { household_id: S.hh, name, sort_order: S.stores.length + 1 });
      await refresh();
    });
  }
  if (act === 'check-add') {
    const label = String(fd.get('label') || '').trim();
    if (!label) return;
    const st = val('check-store') || null;
    await guard(async () => {
      await T.insert('checklist_items', { household_id: S.hh, label, store_id: st, sort_order: S.checklist.length + 1 });
      await refresh();
    });
  }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'qa-input') S.draft = ev.target.value;
});

document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;

  /* --- belépő --- */
  if (act === 'gate-mode') { LS.name = val('g-name') || LS.name; renderGate(el.dataset.mode); return; }

  if (act === 'gate-create') {
    const nm = val('g-name'); const hn = val('g-hh') || 'Otthon';
    if (!nm) return toast('Írd be a nevedet');
    LS.name = nm;
    el.disabled = true;
    await guard(async () => {
      const hid = await createHousehold(hn, nm);
      LS.hh = hid; await boot();
    });
    return;
  }

  if (act === 'gate-join') {
    const nm = val('g-name'); const code = val('g-code').toUpperCase();
    if (!nm) return toast('Írd be a nevedet');
    if (code.length < 4) return toast('Írd be a 6 jegyű kódot');
    LS.name = nm; LS.code = code;
    el.disabled = true;
    await guard(async () => {
      const hid = await joinHousehold(code, nm);
      LS.hh = hid; await boot();
    });
    return;
  }

  /* --- navigáció --- */
  if (act === 'view') { S.view = el.dataset.view; S.modal = null; render(); return; }
  if (act === 'filter') { S.filter = el.dataset.v; render(); return; }
  if (act === 'inv-loc') { S.invLoc = el.dataset.v; render(); return; }
  if (act === 'toggle-done') { S.showDone = !S.showDone; render(); return; }
  if (act === 'modal-close' || (act === 'modal-bg' && ev.target === el)) { closeModal(); return; }

  /* --- lista --- */
  if (act === 'toggle') {
    const i = S.list.find(x => x.id === id); if (!i) return;
    i.done = !i.done; render();
    await guard(async () => { await T.update('list_items', id, { done: i.done, done_at: i.done ? new Date().toISOString() : null }); });
    return;
  }
  if (act === 'quick-suggest') {
    await guard(() => addToList(el.dataset.name, el.dataset.store || null));
    return;
  }
  if (act === 'edit-item') { editItemModal(id); return; }
  if (act === 'item-save') {
    const patch = { name: val('m-name'), qty: val('m-qty') || null, store_id: val('m-store') || null, note: val('m-note') || null };
    if (!patch.name) return toast('A név nem lehet üres');
    await guard(async () => { await T.update('list_items', id, patch); S.modal = null; await refresh(); }, 'Mentve');
    return;
  }
  if (act === 'item-del') {
    await guard(async () => { await T.remove('list_items', id); S.modal = null; await refresh(); }, 'Törölve');
    return;
  }
  if (act === 'clear-done') {
    await guard(async () => {
      const ids = S.list.filter(i => i.done).map(i => i.id);
      await sb.from('list_items').delete().in('id', ids);
      await refresh();
    }, 'Lista rendbe téve');
    return;
  }

  /* --- vásárlás --- */
  if (act === 'trip-start') { S.trip = { storeId: id, step: 'pack', checks: {} }; render(); return; }
  if (act === 'trip-cancel') { S.trip = null; render(); return; }
  if (act === 'pack-toggle') { S.trip.checks[id] = !S.trip.checks[id]; render(); return; }
  if (act === 'trip-go') { S.trip.step = 'shop'; render(); return; }
  if (act === 'trip-finish') { finishTripModal(); return; }
  if (act === 'trip-save') {
    const amount = Number(val('f-amount') || 0);
    const date = val('f-date') || today();
    const note = val('f-note');
    await guard(async () => {
      await finishTrip(S.hh, S.trip.storeId, amount, note, date);
      S.trip = null; S.modal = null; S.view = 'spend';
      await refresh();
    }, 'Kész, rögzítve');
    return;
  }
  if (act === 'trip-del') {
    await guard(async () => { await T.remove('trips', id); await refresh(); }, 'Törölve');
    return;
  }
  if (act === 'spend-add') { spendModal(); return; }
  if (act === 'spend-save') {
    const amount = Number(val('s-amount') || 0);
    const storeId = val('s-store') || null;
    await guard(async () => {
      await T.insert('trips', {
        household_id: S.hh, store_id: storeId, store_name: storeName(storeId),
        amount, spent_at: val('s-date') || today(), note: val('s-note') || null, paid_by: S.user.id
      });
      S.modal = null; await refresh();
    }, 'Mentve');
    return;
  }

  /* --- leltár --- */
  if (act === 'inv-set') {
    const inStock = el.dataset.v === '1';
    const x = S.inventory.find(v => v.id === id); if (!x) return;
    x.in_stock = inStock; render();
    await guard(async () => { await T.update('inventory', id, { in_stock: inStock, updated_at: new Date().toISOString() }); });
    return;
  }
  if (act === 'inv-del') {
    await guard(async () => { await T.remove('inventory', id); await refresh(); }, 'Törölve');
    return;
  }
  if (act === 'inv-to-list') {
    const onList = new Set(S.list.map(i => i.name.toLowerCase()));
    const missing = S.inventory.filter(x => !x.in_stock && !onList.has(x.name.toLowerCase()));
    if (!missing.length) return toast('Már mind fent van a listán');
    await guard(async () => {
      for (const m of missing) await addToList(m.name, null);
    }, missing.length + ' tétel a listán');
    return;
  }

  /* --- beállítások --- */
  if (act === 'save-basics') {
    const hn = val('set-hh'); const nm = val('set-name');
    LS.name = nm;
    await guard(async () => {
      if (hn && hn !== S.hhName) { await sb.from('households').update({ name: hn }).eq('id', S.hh); S.hhName = hn; }
      await sb.from('household_members').update({ display_name: nm }).eq('household_id', S.hh).eq('user_id', S.user.id);
      await refresh();
    }, 'Mentve');
    return;
  }
  if (act === 'copy-code') {
    try { await navigator.clipboard.writeText(S.inviteCode); toast('Kód a vágólapon'); }
    catch { toast('Kód: ' + S.inviteCode); }
    return;
  }
  if (act === 'share-code') {
    const text = `Lépj be a Spejzünkbe! Link: ${location.href.split('#')[0]} Kód: ${S.inviteCode}`;
    if (navigator.share) { try { await navigator.share({ title: 'Spejz', text }); } catch {} }
    else { try { await navigator.clipboard.writeText(text); toast('Meghívó a vágólapon'); } catch { toast(text); } }
    return;
  }
  if (act === 'store-ren') {
    const s = storeById(id); if (!s) return;
    const nn = prompt('Bolt új neve:', s.name);
    if (!nn) return;
    await guard(async () => { await T.update('stores', id, { name: nn.trim() }); await refresh(); }, 'Átnevezve');
    return;
  }
  if (act === 'store-del') {
    if (!confirm('Biztos törlöd ezt a boltot? A hozzá tartozó tételek globálra kerülnek.')) return;
    await guard(async () => { await T.update('stores', id, { archived: true }); await refresh(); }, 'Törölve');
    return;
  }
  if (act === 'check-del') {
    await guard(async () => { await T.remove('checklist_items', id); await refresh(); }, 'Törölve');
    return;
  }
  if (act === 'leave') {
    if (!confirm('Kilépsz ebből a Spejzből ezen az eszközön?')) return;
    LS.hh = null;
    S.hh = null; S.trip = null; S.modal = null;
    renderGate();
    return;
  }
});

/* ---------------- élő frissítés + PWA ---------------- */

function subscribeRealtime() {
  sb.channel('spejz-' + S.hh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items', filter: `household_id=eq.${S.hh}` },
      () => { if (!S.modal) refresh().catch(() => {}); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `household_id=eq.${S.hh}` },
      () => { if (!S.modal) refresh().catch(() => {}); })
    .subscribe();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

boot().then(() => { if (S.hh) subscribeRealtime(); }).catch(e => {
  console.error(e);
  toast('Hiba induláskor: ' + e.message);
});
