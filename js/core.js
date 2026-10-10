'use strict';
/* Agenda de Supervisión Zona 21. Núcleo: utilidades, datos locales y sincronización. */
const VERSION = '1.0.0';

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n, l = 2) => String(n).padStart(l, '0');

const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hoy = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const fmtFecha = s => { if (!s) return ''; const d = parseYmd(s); return d.getDate() + ' ' + MES3[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtLarga = d => { const t = DIA[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()] + ' de ' + d.getFullYear(); return t.charAt(0).toUpperCase() + t.slice(1); };
const diasEntre = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

function debounce(fn, ms) {
  let t = null, args = [];
  const w = (...a) => { args = a; clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, ms); };
  w.flush = () => { if (t) { clearTimeout(t); t = null; fn(...args); } };
  return w;
}

function toast(msg, ms = 3400) {
  let el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('on'), ms);
}

/* ---------- configuración (localStorage) ---------- */
const CFG_KEY = 'z21cfg';
function cfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } }
function setCfg(o) { try { localStorage.setItem(CFG_KEY, JSON.stringify(o)); } catch (e) { /* sin espacio */ } }
function ref() { try { return JSON.parse(localStorage.getItem('z21ref')) || { stats: [], docs: [] }; } catch (e) { return { stats: [], docs: [] }; } }

/* ---------- datos locales (IndexedDB + copia en memoria) ---------- */
const TABLAS = ['escuelas', 'visitas', 'incidencias', 'personal', 'notas', 'eventos', 'ajustes'];
const mem = {};
TABLAS.forEach(t => { mem[t] = new Map(); });
let idb = null;
let dbFalla = false;
let alCambiar = () => {};

async function iniciarDB() {
  try {
    idb = await new Promise((res, rej) => {
      const r = indexedDB.open('agenda-z21', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec', { keyPath: 'k' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const todo = await new Promise((res, rej) => {
      const q = idb.transaction('rec').objectStore('rec').getAll();
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    for (const r of todo) { (mem[r.t] || (mem[r.t] = new Map())).set(r.id, r); }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) {
    console.warn('IndexedDB no disponible', e);
    idb = null; dbFalla = true;
  }
}

function idbPut(r) {
  if (!idb) return;
  try {
    const tx = idb.transaction('rec', 'readwrite');
    tx.objectStore('rec').put(r);
    tx.onerror = () => toast('No se pudo guardar en la tablet. Revisa el espacio disponible.');
  } catch (e) { console.warn(e); }
}

function copia(o) { return JSON.parse(JSON.stringify(o)); }

function guardar(t, obj) {
  const { id, ...resto } = obj;
  const old = mem[t].get(id);
  const u = Math.max(Date.now(), old ? old.u + 1 : 0);
  const r = { k: t + ':' + id, t, id, d: copia(resto), u, x: 0, dirty: 1 };
  mem[t].set(id, r);
  idbPut(r);
  alCambiar();
  return r;
}

function borrar(t, id) {
  const old = mem[t].get(id);
  if (!old) return;
  const r = { k: old.k, t, id, d: {}, u: Math.max(Date.now(), old.u + 1), x: 1, dirty: 1 };
  mem[t].set(id, r);
  idbPut(r);
  alCambiar();
}

function lista(t) {
  const out = [];
  for (const r of mem[t].values()) if (!r.x) out.push({ id: r.id, ...r.d });
  return out;
}
function uno(t, id) { const r = mem[t].get(id); return r && !r.x ? { id: r.id, ...r.d } : null; }
function todosLosRegistros() { const out = []; TABLAS.forEach(t => mem[t].forEach(r => out.push(r))); return out; }
function pendientesDeEnviar() { return todosLosRegistros().filter(r => r.dirty).length; }

/* ---------- escuelas de la zona (de la lista original) ---------- */
const ESCUELAS_SEED = [
  ['29DJN0079Y', 'Don Miguel Hidalgo', 'Tequexquitla'],
  ['29DJN0048E', 'Benito Juárez', 'Cuapiaxtla'],
  ['29DJN0081M', 'Vicente Guerrero', 'Cuapiaxtla'],
  ['29DJN0109B', 'Sócrates', 'Cuapiaxtla'],
  ['29DJN0196N', 'Ponciano Arriaga', 'Tequexquitla'],
  ['29DJN0069R', 'Beethoven', 'Huamantla'],
  ['29DJN0224T', 'Axayácatl', 'Tequexquitla'],
  ['29DJN0233A', 'Francisco Javier Clavijero', 'Cuapiaxtla'],
  ['29DJN0242I', 'Xicohténcatl', 'Tequexquitla'],
  ['29DJN0278X', 'Luis Donaldo Colosio Murrieta', 'Tequexquitla'],
  ['29DJN0284H', 'Helen Keller', 'Altzayanca'],
  ['29DJN0135Z', 'Xóchitl', 'Altzayanca'],
  ['29DJN0293P', 'Estefanía Castañeda', 'Altzayanca']
];

function sembrar() {
  if (lista('escuelas').length || cfg().since) return;
  ESCUELAS_SEED.forEach(([cct, nombre, municipio], i) => {
    const d = { cct, nombre, municipio, turno: 'Matutino', orden: i };
    // u = 1: cualquier dato que llegue del servidor tiene prioridad sobre la semilla
    const r = { k: 'escuelas:' + cct, t: 'escuelas', id: cct, d, u: 1, x: 0, dirty: 1 };
    mem.escuelas.set(cct, r);
    idbPut(r);
  });
}

const escuelas = () => lista('escuelas').sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || a.nombre.localeCompare(b.nombre));
const nom = id => { const e = uno('escuelas', id); return e ? e.nombre : (id || 'Sin escuela'); };
function siguienteNo(t, pref) {
  const n = Math.max(0, ...lista(t).map(r => parseInt(String(r.no || '').replace(/\D/g, ''), 10) || 0)) + 1;
  return pref + pad(n, 3);
}

/* ---------- sincronización con la hoja de Google ---------- */
let sincronizando = false;
let estadoSync = '';

async function sincronizar(manual) {
  const c = cfg();
  if (!c.url || !c.token) { if (manual) toast('Falta la dirección y la clave en Ajustes.'); return false; }
  if (!navigator.onLine) { if (manual) toast('Sin conexión. Los cambios se enviarán cuando haya internet.'); return false; }
  if (sincronizando) return false;
  sincronizando = true; estadoSync = 'Sincronizando'; pintarChip();
  try {
    const sucios = todosLosRegistros().filter(r => r.dirty);
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 45000);
    const resp = await fetch(c.url, {
      method: 'POST', redirect: 'follow', signal: ctl.signal,
      body: JSON.stringify({ token: c.token, since: c.since || 0, changes: sucios.map(r => ({ t: r.t, id: r.id, d: r.d, u: r.u, x: r.x })) })
    });
    clearTimeout(to);
    const out = await resp.json();
    if (!out || !out.ok) throw new Error((out && out.error) || 'Respuesta inválida del servidor');
    for (const r of sucios) { const cur = mem[r.t].get(r.id); if (cur && cur.u === r.u) { cur.dirty = 0; idbPut(cur); } }
    for (const ch of (out.changes || [])) {
      if (!mem[ch.t]) continue;
      const cur = mem[ch.t].get(ch.id);
      if (cur && cur.u >= ch.u) continue;
      const rec = { k: ch.t + ':' + ch.id, t: ch.t, id: ch.id, d: ch.d || {}, u: ch.u, x: ch.x ? 1 : 0, dirty: 0 };
      mem[ch.t].set(ch.id, rec); idbPut(rec);
    }
    if (out.ref) { try { localStorage.setItem('z21ref', JSON.stringify(out.ref)); } catch (e) { /* ignorar */ } }
    const c2 = cfg(); c2.since = out.now; c2.lastSync = Date.now(); setCfg(c2);
    estadoSync = '';
    if (out.omitidos && out.omitidos.length) toast(out.omitidos.length + (out.omitidos.length === 1 ? ' registro es demasiado grande' : ' registros son demasiado grandes') + ' para la hoja de Google y solo se guarda en la tablet. Conviene dividirlo en notas más cortas.', 9000);
    else if (manual) toast('Todo sincronizado.');
    if (typeof alSincronizar === 'function') alSincronizar(out.changes && out.changes.length);
    return true;
  } catch (e) {
    estadoSync = 'Error';
    console.warn('Sync', e);
    if (manual) toast('No se pudo sincronizar: ' + (e.name === 'AbortError' ? 'tardó demasiado' : e.message));
    return false;
  } finally {
    sincronizando = false; pintarChip();
  }
}

const sincronizarPronto = debounce(() => sincronizar(false), 5000);
alCambiar = () => { pintarChip(); if (cfg().url) sincronizarPronto(); };

function pintarChip() {
  const el = $('#chip'); if (!el) return;
  const c = cfg();
  const online = navigator.onLine;
  const n = pendientesDeEnviar();
  let l1 = online ? 'En línea' : 'Sin conexión';
  let l2;
  if (!c.url) l2 = 'Sin hoja de Google conectada';
  else if (estadoSync === 'Sincronizando') l2 = 'Sincronizando';
  else if (estadoSync === 'Error') l2 = 'No se pudo sincronizar';
  else if (n) l2 = n + (n === 1 ? ' cambio por enviar' : ' cambios por enviar');
  else l2 = c.lastSync ? 'Sincronizado ' + new Date(c.lastSync).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Todo al día';
  el.className = 'chip-sync ' + (!online ? 'off' : (n || estadoSync === 'Error') ? 'pend' : 'ok');
  el.innerHTML = '<b>' + l1 + '</b><small>' + esc(l2) + '</small>';
}

/* ---------- copia de seguridad ---------- */
function exportarCopia() {
  const datos = { version: VERSION, fecha: new Date().toISOString(), registros: todosLosRegistros().map(r => ({ t: r.t, id: r.id, d: r.d, u: r.u, x: r.x })) };
  const blob = new Blob([JSON.stringify(datos)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agenda-zona21-copia-' + hoy() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function importarCopia(file) {
  const datos = JSON.parse(await file.text());
  if (!datos || !Array.isArray(datos.registros)) throw new Error('El archivo no es una copia de la agenda');
  let n = 0;
  for (const ch of datos.registros) {
    if (!mem[ch.t]) continue;
    const cur = mem[ch.t].get(ch.id);
    if (cur && cur.u >= ch.u) continue;
    const rec = { k: ch.t + ':' + ch.id, t: ch.t, id: ch.id, d: ch.d || {}, u: ch.u, x: ch.x ? 1 : 0, dirty: 1 };
    mem[ch.t].set(ch.id, rec); idbPut(rec); n++;
  }
  alCambiar();
  return n;
}
