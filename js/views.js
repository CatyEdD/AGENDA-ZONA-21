'use strict';
/* Pantallas (parte A): ayudas, Inicio, Agenda, Escuelas. */

/* ---------- iconos ---------- */
const IC = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  escuelas: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 5V2"/>',
  personal: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.9.2 5 2.4 5 5.3"/>',
  visitas: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>',
  incidencias: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  biblioteca: '<path d="M4 4h6a3 3 0 013 3v14a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3"/><path d="M20 4v15h-7"/>',
  notas: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  sync: '<path d="M20 11a8 8 0 00-14-4M4 4v4h4M4 13a8 8 0 0014 4M20 20v-4h-4"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  imprimir: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  enlace: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  mapa: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  carpeta: '<path d="M3 6h7l2 3h9v10H3z"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>'
};
const icon = (n, s = 22) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;


const leyenda = items => `<div class="leyenda">${items.map(([c, t]) => `<span class="lg"><span class="sw ${c}"></span>${t}</span>`).join('')}</div>`;

/* ---------- ayudas de formularios ---------- */
const campo = (name, label, val = '', o = {}) => `<label class="f${o.cls ? ' ' + o.cls : ''}"><span>${label}</span><input name="${name}" type="${o.type || 'text'}" value="${esc(val)}"${o.list ? ` list="${o.list}"` : ''}${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''} autocomplete="off"></label>`;
const area = (name, label, val = '', rows = 3, o = {}) => `<label class="f${o.cls ? ' ' + o.cls : ''}"><span>${label}</span><textarea name="${name}" rows="${rows}">${esc(val)}</textarea></label>`;
const selector = (name, label, opciones, val, o = {}) => `<label class="f${o.cls ? ' ' + o.cls : ''}"><span>${label}</span><select name="${name}">${opciones.map(([v, t]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
const grupo = (name, label, opciones, val, multi = false, o = {}) => `<fieldset class="f chips${o.cls ? ' ' + o.cls : ''}"><legend>${label}</legend>${opciones.map(op => `<label class="chip"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${esc(op)}"${(multi ? (val || []).includes(op) : val === op) ? ' checked' : ''}><span>${esc(op)}</span></label>`).join('')}</fieldset>`;
const opcionesEsc = (vacio = 'Elige la escuela') => [['', vacio], ...escuelas().map(e => [e.id, e.nombre])];

function recoger(root, d) {
  const nombres = new Set($$('[name]', root).map(e => e.name));
  nombres.forEach(n => {
    const els = $$('[name]', root).filter(e => e.name === n);
    const t = els[0].type;
    if (t === 'checkbox') d[n] = els.filter(e => e.checked).map(e => e.value);
    else if (t === 'radio') { const c = els.find(e => e.checked); d[n] = c ? c.value : ''; }
    else d[n] = els[0].value;
  });
}

let limpiezas = [];
function limpiar() { const l = limpiezas; limpiezas = []; l.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }

function mostrarGuardado() {
  const el = $('#guardado'); if (!el) return;
  el.textContent = 'Guardado en la tablet'; el.classList.add('on');
  clearTimeout(mostrarGuardado._t); mostrarGuardado._t = setTimeout(() => el.classList.remove('on'), 1800);
}

/* Editor con guardado automático: no crea el registro hasta que se escribe algo. */
function montarEditor(root, tabla, obj, o = {}) {
  const persistir = () => { recoger(root, obj); if (o.antes) o.antes(obj); guardar(tabla, obj); mostrarGuardado(); };
  const deb = debounce(persistir, 500);
  root.addEventListener('input', e => { if (e.target.closest('.ink')) return; deb(); });
  root.addEventListener('change', e => { if (e.target.closest('.ink')) return; deb(); deb.flush(); });
  limpiezas.push(() => deb.flush());
  return { persistir, deb };
}

const tagEstado = e => {
  const cls = { Pendiente: 'pend', Atendido: 'ok', Cerrado: 'ok', Resuelto: 'ok', Importante: 'imp', 'En proceso': 'pend' }[e] || 'neutro';
  return `<span class="tag ${cls}">${esc(e || 'Sin estado')}</span>`;
};
const volverA = (ruta, txt) => `<a class="volver noprint" href="${ruta}">${icon('atras', 18)}<span>${txt}</span></a>`;
const vacio = (txt, accion) => `<div class="vacio"><p>${txt}</p>${accion || ''}</div>`;

function tarjeta({ icono, titulo, texto, ruta, href, badge }) {
  const dest = href ? `href="${esc(href)}" target="_blank" rel="noopener"` : `href="${ruta}"`;
  return `<a class="hub" ${dest}><span class="hub-ic">${icon(icono, 30)}</span><span class="hub-tx"><b>${titulo}</b><small>${texto}</small></span>${badge != null ? `<span class="badge" aria-label="${badge} registros">${badge}</span>` : ''}${href ? `<span class="hub-ext">${icon('enlace', 16)}</span>` : ''}</a>`;
}

/* ---------- cálculos compartidos ---------- */
function ultimaVisita(cct) {
  const h = hoy();
  const f = lista('visitas').filter(v => v.escuela === cct && v.fecha && v.fecha <= h).map(v => v.fecha).sort();
  return f.length ? f[f.length - 1] : '';
}
const seguimientosPendientes = () => lista('visitas').filter(v => v.estado === 'Pendiente' && (v.acuerdo || v.seguimiento));

function itemsDia(f) {
  const out = [];
  lista('eventos').filter(e => e.fecha === f).forEach(e => out.push({ tipo: e.tipo || 'jornada', texto: e.texto || 'Sin título', hora: e.hora, evId: e.id }));
  lista('visitas').forEach(v => {
    if (v.fecha === f) out.push({ tipo: 'supervision', texto: 'Visita: ' + nom(v.escuela), corto: nom(v.escuela), ruta: '#/visitas/' + v.id });
    if (v.seguimiento === f && v.estado === 'Pendiente') out.push({ tipo: 'supervision', texto: 'Seguimiento: ' + nom(v.escuela), corto: 'Seg. ' + nom(v.escuela), ruta: '#/visitas/' + v.id });
  });
  escuelas().forEach(e => { if (e.proxima === f) out.push({ tipo: 'supervision', texto: 'Próxima visita: ' + e.nombre, corto: e.nombre, ruta: '#/escuelas/' + e.id }); });
  lista('incidencias').forEach(i => { if (i.fecha === f) out.push({ tipo: 'ausencia', texto: 'Ausencia: ' + (i.personal || 'personal'), corto: i.personal || 'Ausencia', ruta: '#/incidencias/' + i.id }); });
  return out;
}
const TIPOS_EV = [['jornada', 'Jornada oficial'], ['suspension', 'Suspensión'], ['cte', 'Consejo Técnico'], ['supervision', 'Supervisión']];
const NOMBRE_TIPO = { jornada: 'Jornada oficial', suspension: 'Suspensión', cte: 'Consejo Técnico', supervision: 'Supervisión', ausencia: 'Ausencia del personal' };

/* =====================================================================
   INICIO
   ===================================================================== */
function vInicio() {
  const owner = cfg().owner || 'Catalina Teroba Jaime';
  const foco = uno('ajustes', 'foco') || { id: 'foco', escuela: '', accion: '', resolver: '', recordatorio: '' };
  const h = hoy();

  // mosaico de cobertura de visitas
  const mosaico = escuelas().map(e => {
    const u = ultimaVisita(e.id);
    const d = u ? diasEntre(u, h) : null;
    const cls = d == null ? 'nunca' : d <= 30 ? 'ok' : d <= 60 ? 'medio' : 'tarde';
    const txt = d == null ? 'Sin visitas' : d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : 'Hace ' + d + ' días';
    return `<a class="tile ${cls}" href="#/escuelas/${esc(e.id)}"><b>${esc(e.nombre)}</b><small>${esc(e.municipio || '')}</small><em>${txt}</em></a>`;
  }).join('');

  // próximas visitas
  const prox = [];
  lista('eventos').filter(e => e.tipo === 'supervision' && e.fecha >= h).forEach(e => prox.push({ f: e.fecha, t: e.texto || 'Supervisión', r: '#/agenda/' + e.fecha.slice(0, 7) }));
  escuelas().filter(e => e.proxima && e.proxima >= h).forEach(e => prox.push({ f: e.proxima, t: 'Visita a ' + e.nombre, r: '#/escuelas/' + e.id }));
  lista('visitas').filter(v => v.estado === 'Pendiente' && v.seguimiento && v.seguimiento >= h).forEach(v => prox.push({ f: v.seguimiento, t: 'Seguimiento en ' + nom(v.escuela), r: '#/visitas/' + v.id }));
  prox.sort((a, b) => a.f.localeCompare(b.f));
  const proxHTML = prox.length ? `<ul class="lista">${prox.slice(0, 6).map(p => `<li><a href="${p.r}"><b>${fmtFecha(p.f)}</b><span>${esc(p.t)}</span></a></li>`).join('')}</ul>` : vacio('Sin visitas programadas. Se agregan desde la agenda o desde la ficha de cada escuela.');

  // pendientes
  const seg = seguimientosPendientes(), vencidos = seg.filter(v => v.seguimiento && v.seguimiento < h).length;
  const incAb = lista('incidencias').filter(i => i.estado !== 'Cerrado').length;
  const notasP = lista('notas').filter(n => n.estado === 'Pendiente' || n.estado === 'Importante').length;
  const fila = (n, txt, ruta, extra = '') => `<li><a href="${ruta}"><b class="num">${n}</b><span>${txt}${extra}</span></a></li>`;
  const pendHTML = `<ul class="lista">${fila(seg.length, 'seguimientos de visita por atender', '#/visitas/pendientes', vencidos ? ` <i class="alerta">${vencidos} vencido${vencidos > 1 ? 's' : ''}</i>` : '')}${fila(incAb, 'incidencias del personal abiertas', '#/incidencias/historial')}${fila(notasP, 'notas pendientes o importantes', '#/notas')}</ul>`;

  // fechas importantes
  const imp = lista('eventos').filter(e => e.tipo !== 'supervision' && e.fecha >= h).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);
  const impHTML = imp.length ? `<ul class="lista">${imp.map(e => `<li><a href="#/agenda/${e.fecha.slice(0, 7)}"><b>${fmtFecha(e.fecha)}</b><span>${esc(e.texto)} <small>${NOMBRE_TIPO[e.tipo] || ''}</small></span></a></li>`).join('')}</ul>` : vacio('Sin fechas marcadas. Las suspensiones y el Consejo Técnico se agregan en la agenda.');

  // datos de la zona
  const esc13 = escuelas();
  const suma = k => esc13.reduce((s, e) => s + (parseInt(e[k], 10) || 0), 0);
  const conMat = esc13.filter(e => parseInt(e.matricula, 10)).length;
  const rf = ref();
  const calc = `<dl class="datos"><div><dt>Escuelas</dt><dd>${esc13.length}</dd></div><div><dt>Matrícula</dt><dd>${conMat ? suma('matricula') : '-'}</dd></div><div><dt>Grupos</dt><dd>${esc13.some(e => parseInt(e.grupos, 10)) ? suma('grupos') : '-'}</dd></div><div><dt>Docentes</dt><dd>${esc13.some(e => parseInt(e.docentes, 10)) ? suma('docentes') : '-'}</dd></div></dl>${conMat < esc13.length ? `<p class="nota">Matrícula capturada en ${conMat} de ${esc13.length} fichas.</p>` : ''}`;
  const sheet = rf.stats && rf.stats.length ? `<table class="mini"><tbody>${rf.stats.slice(0, 12).map(s => `<tr><th>${esc(s.indicador)}${s.escuela ? ` <small>${esc(nom(s.escuela))}</small>` : ''}</th><td>${esc(s.valor)}</td><td class="corte">${esc(s.corte || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="nota">Los indicadores de la hoja de Google aparecen aquí al sincronizar.</p>';

  return {
    titulo: 'Mi supervisión',
    html: `<div class="inicio">
      <div class="saludo"><div><p class="fecha">${fmtLarga(new Date())}</p><p class="sub">${esc(owner)}, Zona Escolar 21, ciclo 2026-2027</p></div>
        <div class="rapidas noprint"><a class="btn pri" href="#/visitas/nueva">${icon('mas', 18)} Registrar visita</a><a class="btn" href="#/incidencias/nueva">${icon('mas', 18)} Incidencia</a><a class="btn" href="#/notas/nueva">${icon('mas', 18)} Nota</a></div></div>
      <div class="cols">
        <div class="col-a">
          <section class="panel foco"><h2>En foco</h2><form id="foco" onsubmit="return false">
            ${campo('escuela', 'Escuela o asunto prioritario', foco.escuela)}
            ${campo('recordatorio', 'Recordatorio', foco.recordatorio)}
            ${area('accion', 'Acción principal', foco.accion, 3)}
            ${area('resolver', 'Por resolver', foco.resolver, 3)}
          </form></section>
          <section class="panel"><h2>Visitas por escuela</h2>
            ${leyenda([['ok', 'hasta 30 días'], ['medio', '31 a 60 días'], ['tarde', 'más de 60 días'], ['nunca', 'sin visitas']])}
            <div class="mosaico">${mosaico}</div></section>
        </div>
        <div class="col-b">
          <section class="panel"><h2>Próximas visitas</h2>${proxHTML}</section>
          <section class="panel"><h2>Pendientes</h2>${pendHTML}</section>
          <section class="panel"><h2>Fechas importantes</h2>${impHTML}</section>
          <section class="panel"><h2>Datos de la zona</h2>${calc}${sheet}</section>
        </div>
      </div></div>`,
    montar(root) { montarEditor($('#foco', root), 'ajustes', foco); }
  };
}

/* =====================================================================
   AGENDA
   ===================================================================== */
const MESES_CICLO = [[2026, 7], [2026, 8], [2026, 9], [2026, 10], [2026, 11], [2027, 0], [2027, 1], [2027, 2], [2027, 3], [2027, 4], [2027, 5], [2027, 6]];

function vAgenda(ymParam) {
  const claves = MESES_CICLO.map(([y, m]) => y + '-' + pad(m + 1));
  let ym = ymParam && /^\d{4}-\d{2}/.test(ymParam) ? ymParam.slice(0, 7) : hoy().slice(0, 7);
  if (!claves.includes(ym)) ym = ym < claves[0] ? claves[0] : claves[claves.length - 1];
  const [Y, M] = ym.split('-').map(Number), m0 = M - 1;
  const i = claves.indexOf(ym);
  const prev = claves[i - 1], sig = claves[i + 1];

  const primero = new Date(Y, m0, 1), desfase = (primero.getDay() + 6) % 7, dim = new Date(Y, m0 + 1, 0).getDate();
  const celdas = [];
  for (let k = 0; k < desfase; k++) celdas.push(null);
  for (let d = 1; d <= dim; d++) celdas.push(d);
  while (celdas.length % 7) celdas.push(null);
  const h = hoy();
  const cuerpo = celdas.map((d, k) => {
    if (!d) return '<div class="dia vacio-d"></div>';
    const f = Y + '-' + pad(M) + '-' + pad(d), its = itemsDia(f), fin = k % 7 >= 5;
    const chips = its.slice(0, 3).map(it => `<span class="ev ${it.tipo}" title="${esc(it.texto)}">${esc(it.corto || it.texto)}</span>`).join('') + (its.length > 3 ? `<span class="mas">+${its.length - 3} más</span>` : '');
    return `<button type="button" class="dia${fin ? ' fin' : ''}${f === h ? ' hoy' : ''}" data-dia="${f}" aria-label="${d} de ${MES[m0]}, ${its.length} eventos"><b>${d}</b>${chips}</button>`;
  }).join('');

  const mesAj = uno('ajustes', 'mes-' + ym) || { id: 'mes-' + ym, prioridades: '', pendientes: '', notas: '' };
  const tabs = claves.map((c, k) => `<a class="mtab${c === ym ? ' on' : ''}" href="#/agenda/${c}">${MES3[MESES_CICLO[k][1]]}<small>${MESES_CICLO[k][0]}</small></a>`).join('');

  return {
    titulo: 'Agenda 2026-2027',
    html: `<div class="agenda">
      <div class="mtabs noprint" role="navigation" aria-label="Meses del ciclo escolar">${tabs}</div>
      <div class="a-cab"><div class="a-nav noprint">${prev ? `<a class="btn ico" href="#/agenda/${prev}" aria-label="Mes anterior">${icon('atras')}</a>` : '<span class="btn ico off"></span>'}${sig ? `<a class="btn ico" href="#/agenda/${sig}" aria-label="Mes siguiente" style="transform:scaleX(-1)">${icon('atras')}</a>` : '<span class="btn ico off"></span>'}</div>
        <h2>${MES[m0]} ${Y}</h2>
        <div class="a-acc noprint"><a class="btn" href="${esc(ENLACES.calendario)}" target="_blank" rel="noopener">${icon('enlace', 18)} Calendario oficial SEP</a><button class="btn" data-act="imprimir">${icon('imprimir', 18)} PDF</button></div></div>
      <div class="a-cuerpo">
        <div class="cal"><div class="cal-sem">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid">${cuerpo}</div>
          ${leyenda([['jornada', 'Jornada oficial'], ['suspension', 'Suspensión'], ['cte', 'Consejo Técnico'], ['supervision', 'Supervisión'], ['ausencia', 'Ausencia del personal']])}</div>
        <form class="a-lado panel" id="mes" onsubmit="return false">
          ${area('prioridades', 'Prioridades del mes', mesAj.prioridades, 5)}
          ${area('pendientes', 'Pendientes', mesAj.pendientes, 5)}
          ${area('notas', 'Notas', mesAj.notas, 5)}
        </form>
      </div></div>`,
    montar(root) { montarEditor($('#mes', root), 'ajustes', mesAj); }
  };
}

function abrirDia(f) {
  const dlg = $('#dlg'); const d = parseYmd(f);
  const its = itemsDia(f);
  dlg.innerHTML = `<form method="dialog" class="dlg-in"><header><h3>${fmtLarga(d)}</h3><button class="btn ico" value="x" aria-label="Cerrar">&times;</button></header>
    <div class="dlg-cuerpo">${its.length ? `<ul class="lista">${its.map(it => `<li class="it"><span class="sw ${it.tipo}"></span>${it.ruta ? `<a href="${it.ruta}">${esc(it.texto)}</a>` : `<span>${esc(it.texto)}${it.hora ? ` <small>${esc(it.hora)}</small>` : ''}</span>`}<small>${NOMBRE_TIPO[it.tipo] || ''}</small>${it.evId ? `<button type="button" class="btn chico" data-act="borrar-ev" data-id="${it.evId}">Quitar</button>` : ''}</li>`).join('')}</ul>` : '<p class="nota">Sin eventos este día.</p>'}
    <fieldset class="nuevo-ev"><legend>Agregar a este día</legend>
      <label class="f"><span>Tipo</span><select id="ev-tipo">${TIPOS_EV.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
      <label class="f"><span>Descripción</span><input id="ev-texto" autocomplete="off"></label>
      <label class="f"><span>Hora (opcional)</span><input id="ev-hora" type="time"></label>
      <button type="button" class="btn pri" data-act="agregar-ev" data-f="${f}">Agregar</button></fieldset>
    <a class="btn" href="#/visitas/nueva?fecha=${f}">${icon('mas', 18)} Registrar visita en esta fecha</a></div></form>`;
  if (!dlg.open) dlg.showModal();
}

/* =====================================================================
   ESCUELAS
   ===================================================================== */
function vEscuelas() {
  const h = hoy();
  const grupos = {};
  escuelas().forEach(e => { (grupos[e.municipio || 'Sin municipio'] = grupos[e.municipio || 'Sin municipio'] || []).push(e); });
  const html = Object.keys(grupos).sort().map(mun => `<section class="mun"><h2>${esc(mun)} <small>${grupos[mun].length} ${grupos[mun].length === 1 ? 'escuela' : 'escuelas'}</small></h2><div class="esc-grid">${grupos[mun].map(e => {
    const u = ultimaVisita(e.id), pend = seguimientosPendientes().filter(v => v.escuela === e.id).length;
    return `<a class="esc" href="#/escuelas/${esc(e.id)}"><b>${esc(e.nombre)}</b><span class="cct">${esc(e.cct || e.id)}</span><small>${u ? 'Última visita: ' + fmtFecha(u) : 'Sin visitas registradas'}</small>${pend ? `<span class="tag pend">${pend} por atender</span>` : ''}</a>`;
  }).join('')}</div></section>`).join('');
  return { titulo: 'Escuelas', html: `<p class="intro">${escuelas().length} jardines de niños de la zona, agrupados por municipio.</p>${html}` };
}

function vEscuela(id) {
  const e = uno('escuelas', id);
  if (!e) return { titulo: 'Escuela', html: volverA('#/escuelas', 'Escuelas') + vacio('No se encontró esta escuela.') };
  const u = ultimaVisita(id);
  const vs = lista('visitas').filter(v => v.escuela === id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 4);
  const nVis = lista('visitas').filter(v => v.escuela === id).length;
  const nInc = lista('incidencias').filter(i => i.escuela === id).length;
  const nPer = lista('personal').filter(p => p.escuela === id).length;
  const mapa = e.domicilio ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.domicilio + ', Tlaxcala, México')}` : '';
  return {
    titulo: e.nombre,
    html: `${volverA('#/escuelas', 'Escuelas')}
    <div class="ficha-cab"><div><h2>${esc(e.nombre)}</h2><p class="cct">CCT ${esc(e.cct || e.id)}${e.municipio ? ', ' + esc(e.municipio) : ''}</p></div><span id="guardado" class="guardado" aria-live="polite"></span>
      <div class="rapidas noprint"><a class="btn pri" href="#/visitas/nueva?escuela=${esc(id)}">${icon('mas', 18)} Registrar visita</a><button class="btn" data-act="imprimir">${icon('imprimir', 18)} PDF</button></div></div>
    <form id="ed" class="ficha" onsubmit="return false">
      <section class="panel"><h3>Datos generales</h3>${campo('domicilio', 'Domicilio', e.domicilio)}${campo('turno', 'Turno', e.turno)}${campo('programas', 'Programas', e.programas)}${mapa ? `<a class="btn chico noprint" href="${mapa}" target="_blank" rel="noopener">${icon('mapa', 16)} Cómo llegar</a>` : ''}</section>
      <section class="panel"><h3>Datos del plantel</h3><div class="dos">${campo('matricula', 'Matrícula', e.matricula, { type: 'number', mode: 'numeric' })}${campo('grupos', 'Grupos', e.grupos, { type: 'number', mode: 'numeric' })}${campo('docentes', 'Docentes', e.docentes, { type: 'number', mode: 'numeric' })}${campo('acompanante', 'Acompañante musical', e.acompanante)}${campo('intendente', 'Intendente', e.intendente)}${campo('otro', 'Otro personal', e.otro)}</div></section>
      <section class="panel"><h3>Responsable</h3>${campo('resp_nombre', 'Nombre', e.resp_nombre)}${campo('resp_funcion', 'Función', e.resp_funcion)}${campo('resp_tel', 'Teléfono', e.resp_tel, { type: 'tel', mode: 'tel' })}${campo('resp_correo', 'Correo electrónico', e.resp_correo, { type: 'email' })}
        <div class="noprint acc-fila">${e.resp_tel ? `<a class="btn chico" href="tel:${esc(e.resp_tel)}">${icon('tel', 16)} Llamar</a>` : ''}${e.resp_correo ? `<a class="btn chico" href="mailto:${esc(e.resp_correo)}">${icon('correo', 16)} Escribir</a>` : ''}</div></section>
      <section class="panel"><h3>Seguimiento</h3><p class="dato"><span>Última visita</span><b>${u ? fmtFecha(u) : 'Sin visitas registradas'}</b></p>${campo('proposito', 'Propósito', e.proposito)}${campo('proxima', 'Próxima visita', e.proxima, { type: 'date' })}${area('acuerdos', 'Acuerdos y pendientes', e.acuerdos, 3)}</section>
      <section class="panel ancho">${tintaHTML(360, 'Apuntes a mano de esta escuela')}</section>
    </form>
    <div class="atajos noprint">${tarjeta({ icono: 'personal', titulo: 'Personal', texto: nPer ? nPer + ' registrados' : 'Sin personal capturado', ruta: '#/personal?escuela=' + id })}${tarjeta({ icono: 'visitas', titulo: 'Visitas', texto: nVis ? nVis + ' registradas' : 'Sin visitas', ruta: '#/visitas/historial?escuela=' + id })}${tarjeta({ icono: 'incidencias', titulo: 'Incidencias', texto: nInc ? nInc + ' registradas' : 'Sin incidencias', ruta: '#/incidencias/historial?escuela=' + id })}</div>
    ${vs.length ? `<section class="panel"><h3>Últimas visitas</h3><ul class="lista">${vs.map(v => `<li><a href="#/visitas/${v.id}"><b>${fmtFecha(v.fecha)}</b><span>${esc((v.tipo || []).join(', ') || 'Visita')}${v.proposito ? ', ' + esc(v.proposito) : ''}</span>${tagEstado(v.estado)}</a></li>`).join('')}</ul></section>` : ''}`,
    montar(root) {
      const ed = montarEditor($('#ed', root), 'escuelas', e);
      montarTinta($('.ink', root), e, 'tinta', ed.persistir);
    }
  };
}
