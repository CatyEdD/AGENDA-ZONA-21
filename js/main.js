'use strict';
/* Enrutador, eventos globales y arranque. */

const NAV = [['inicio', 'Inicio'], ['agenda', 'Agenda'], ['escuelas', 'Escuelas'], ['personal', 'Personal'], ['visitas', 'Visitas'], ['incidencias', 'Incidencias'], ['biblioteca', 'Biblioteca'], ['notas', 'Notas']];

function leerHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [ruta, qs = ''] = raw.split('?');
  const p = ruta.split('/').filter(Boolean).map(decodeURIComponent);
  const q = {}; new URLSearchParams(qs).forEach((v, k) => { q[k] = v; });
  return { p, q };
}

function pantalla(p, q) {
  const [a, b] = p;
  switch (a || 'inicio') {
    case 'inicio': return vInicio();
    case 'agenda': return vAgenda(b);
    case 'escuelas': return b ? vEscuela(b) : vEscuelas();
    case 'personal': return b ? vPersona(b, q) : vPersonal(q);
    case 'visitas':
      if (!b) return vVisitasHub();
      if (b === 'historial') return vHistorialVisitas(q);
      if (b === 'pendientes') return vSeguimientos();
      if (b === 'instrumentos') return vInstrumentos();
      return vVisita(b, q);
    case 'incidencias':
      if (!b) return vIncidenciasHub();
      if (b === 'historial') return vHistorialIncidencias(q);
      return vIncidencia(b, q);
    case 'biblioteca': return vBiblioteca();
    case 'notas': return b ? vNota(b) : vNotas(q);
    case 'ajustes': return vAjustes();
    case 'buscar': return vBuscar(q);
    default: return { titulo: 'No encontrado', html: vacio('Esta pantalla no existe.', '<a class="btn pri" href="#/inicio">Ir al inicio</a>') };
  }
}

function render() {
  limpiar();
  const { p, q } = leerHash();
  const sec = p[0] || 'inicio';
  let out;
  try { out = pantalla(p, q); } catch (err) {
    console.error(err);
    out = { titulo: 'Error', html: `<div class="panel"><p>Algo falló al abrir esta pantalla. Lo capturado sigue guardado.</p><pre>${esc(err.message)}</pre><a class="btn pri" href="#/inicio">Ir al inicio</a></div>` };
  }
  document.title = out.titulo + ', Agenda Zona 21';
  $('#titulo').textContent = out.titulo;
  const v = $('#view'); v.innerHTML = out.html; v.scrollTop = 0;
  $$('#rail a[data-nav]').forEach(a => { const on = a.dataset.nav === sec; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (out.montar) { try { out.montar(v); } catch (err) { console.error(err); toast('Una parte de la pantalla no pudo cargar.'); } }
}
function alSincronizar(n) {
  if (!n) return;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  const { p } = leerHash();
  const editor = p[1] && !['historial', 'pendientes', 'instrumentos'].includes(p[1]) && ['visitas', 'incidencias', 'notas', 'personal', 'escuelas', 'agenda'].includes(p[0]);
  if (!editor) render();
}

/* ---------- eventos globales ---------- */
document.addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]');
  if (go && !ev.target.closest('a,button')) { location.hash = go.dataset.go; return; }
  const dia = ev.target.closest('[data-dia]');
  if (dia) { abrirDia(dia.dataset.dia); return; }
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'imprimir') window.print();
  else if (act === 'sync') sincronizar(true);
  else if (act === 'exportar') exportarCopia();
  else if (act === 'atender') { const v = uno(b.dataset.t, b.dataset.id); if (v) { v.estado = 'Atendido'; guardar(b.dataset.t, v); toast('Marcado como atendido.'); render(); } }
  else if (act === 'eliminar') {
    if (confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) { limpiar(); borrar(b.dataset.t, b.dataset.id); toast('Registro eliminado.'); history.back(); }
  } else if (act === 'agregar-ev') {
    const texto = $('#ev-texto').value.trim();
    if (!texto) { toast('Escribe una descripción para el evento.'); $('#ev-texto').focus(); return; }
    guardar('eventos', { id: uid(), fecha: b.dataset.f, tipo: $('#ev-tipo').value, texto, hora: $('#ev-hora').value });
    $('#dlg').close(); render(); toast('Evento agregado.');
  } else if (act === 'borrar-ev') { borrar('eventos', b.dataset.id); $('#dlg').close(); render(); }
});
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter') return;
  const go = ev.target.closest && ev.target.closest('tr[data-go]');
  if (go) location.hash = go.dataset.go;
});

/* ---------- búsqueda ---------- */
let antesBusqueda = '#/inicio';
function iniciarBusqueda() {
  const q = $('#q');
  const ir = debounce(() => {
    const t = q.value.trim();
    const enBusqueda = (leerHash().p[0] === 'buscar');
    if (t.length < 2) { if (enBusqueda && !t.length) location.hash = antesBusqueda; return; }
    const h = '#/buscar?texto=' + encodeURIComponent(t);
    if (!enBusqueda) { antesBusqueda = location.hash || '#/inicio'; location.hash = h; }
    else { history.replaceState(null, '', h); render(); }
  }, 250);
  q.addEventListener('input', ir);
  window.addEventListener('hashchange', () => { if (leerHash().p[0] !== 'buscar' && q.value) q.value = ''; });
}

/* ---------- arranque ---------- */
async function arrancar() {
  if (arrancar.hecho) return; arrancar.hecho = true;
  $('#rail-nav').innerHTML = NAV.map(([k, t]) => `<a href="#/${k}" data-nav="${k}">${icon(k, 24)}<span>${t}</span></a>`).join('');
  $('#rail-pie').insertAdjacentHTML('afterbegin', `<a href="#/ajustes" data-nav="ajustes">${icon('ajustes', 24)}<span>Ajustes</span></a>`);
  $('#btn-sync-top').innerHTML = icon('sync', 20);
  $('#btn-sync-top').addEventListener('click', () => { if (cfg().url) sincronizar(true); else location.hash = '#/ajustes'; });
  $('#chip').addEventListener('click', () => { if (cfg().url) sincronizar(true); else location.hash = '#/ajustes'; });
  $('#q').insertAdjacentHTML('beforebegin', icon('buscar', 20));

  await iniciarDB();
  sembrar();
  pintarChip();
  iniciarBusqueda();
  window.addEventListener('hashchange', render);
  window.addEventListener('online', () => { pintarChip(); sincronizar(false); });
  window.addEventListener('offline', pintarChip);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(false); });
  setInterval(() => sincronizar(false), 5 * 60 * 1000);
  render();
  sincronizar(false);

  // portada
  const por = $('#portada');
  if (por) {
    if (sessionStorage.getItem('z21portada')) por.remove();
    else {
      sessionStorage.setItem('z21portada', '1');
      const cerrar = () => { por.classList.add('fuera'); setTimeout(() => por.remove(), 500); };
      por.addEventListener('click', cerrar); setTimeout(cerrar, 2200);
    }
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        nuevo && nuevo.addEventListener('statechange', () => { if (nuevo.state === 'installed' && navigator.serviceWorker.controller) toast('Hay una versión nueva. Cierra y vuelve a abrir la agenda para usarla.', 8000); });
      });
    }).catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', arrancar);
