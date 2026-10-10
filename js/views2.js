'use strict';
/* Pantallas (parte B): Personal, Visitas, Incidencias, Biblioteca, Notas, Ajustes, Búsqueda. */

const ordenFecha = (a, b) => (b.fecha || '').localeCompare(a.fecha || '') || String(b.no || '').localeCompare(String(a.no || ''));

/* Historial genérico con filtros (visitas e incidencias) */
function historial(o) {
  const fEsc = o.q.escuela || '';
  const cab = `${volverA(o.volver, o.volverTxt)}
    <div class="filtros noprint">
      <label class="f"><span>Escuela</span><select id="f-esc">${opcionesEsc('Todas las escuelas').map(([v, t]) => `<option value="${esc(v)}"${v === fEsc ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <fieldset class="f chips"><legend>Estado</legend>${['Todos', ...o.estados].map((s, i) => `<label class="chip"><input type="radio" name="f-est" value="${s}"${i === 0 ? ' checked' : ''}><span>${s}</span></label>`).join('')}</fieldset>
      <label class="f grande"><span>Buscar</span><input id="f-txt" type="search" placeholder="Nombre, propósito, motivo" autocomplete="off"></label>
      <button class="btn" data-act="imprimir">${icon('imprimir', 18)} PDF</button><a class="btn pri" href="${o.nueva}${fEsc ? '?escuela=' + encodeURIComponent(fEsc) : ''}">${icon('mas', 18)} ${o.nuevaTxt}</a></div>
    <p class="solo-imprimir">${esc(o.titulo)}, Zona Escolar 21, ciclo 2026-2027</p>
    <div class="tabla-w"><table class="tabla"><thead><tr>${o.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody id="filas"></tbody></table></div><p id="cuenta" class="nota"></p>`;
  return {
    titulo: o.titulo,
    html: cab,
    montar(root) {
      const pintar = () => {
        const e = $('#f-esc', root).value, s = ($('input[name="f-est"]:checked', root) || {}).value || 'Todos', t = norm($('#f-txt', root).value);
        const rows = lista(o.tabla).filter(r => (!e || r.escuela === e) && (s === 'Todos' || r.estado === s) && (!t || norm(textoDe(r)).includes(t))).sort(ordenFecha);
        $('#filas', root).innerHTML = rows.length ? rows.map(o.fila).join('') : `<tr><td colspan="${o.cols.length}" class="vacio-td">${lista(o.tabla).length ? 'Ningún registro coincide con el filtro.' : 'Todavía no hay registros.'}</td></tr>`;
        $('#cuenta', root).textContent = rows.length + ' de ' + lista(o.tabla).length + ' registros';
      };
      const zona = $('.filtros', root);
      zona.addEventListener('input', pintar); zona.addEventListener('change', pintar);
      pintar();
    }
  };
}

function textoDe(d) {
  return Object.keys(d).filter(k => k !== 'tinta' && k !== 'id').map(k => Array.isArray(d[k]) ? d[k].join(' ') : (typeof d[k] === 'object' ? '' : d[k])).join(' ') + ' ' + (d.escuela ? nom(d.escuela) : '');
}

/* =====================================================================
   VISITAS
   ===================================================================== */
function vVisitasHub() {
  const nV = lista('visitas').length, nP = seguimientosPendientes().length;
  return {
    titulo: 'Visitas y acompañamiento',
    html: `<p class="intro">Seguimiento a escuelas, ciclo escolar 2026-2027.</p><div class="hubs">
      ${tarjeta({ icono: 'visitas', titulo: 'Registrar visita', texto: 'Datos esenciales de la visita y acuerdos', ruta: '#/visitas/nueva' })}
      ${tarjeta({ icono: 'agenda', titulo: 'Historial de visitas', texto: 'Consulta de visitas realizadas', ruta: '#/visitas/historial', badge: nV })}
      ${tarjeta({ icono: 'sync', titulo: 'Seguimientos pendientes', texto: 'Acuerdos y compromisos por atender', ruta: '#/visitas/pendientes', badge: nP })}
      ${tarjeta({ icono: 'doc', titulo: 'Instrumentos', texto: 'Fichas de observación y asesoría', ruta: '#/visitas/instrumentos' })}</div>`
  };
}

function vVisita(id, q) {
  let v = id === 'nueva' ? null : uno('visitas', id);
  if (id !== 'nueva' && !v) return { titulo: 'Visita', html: volverA('#/visitas', 'Visitas') + vacio('No se encontró esta visita.') };
  if (!v) v = { id: uid(), fecha: q.fecha || hoy(), escuela: q.escuela || '', tipo: [], persona: '', proposito: '', hallazgo: '', acuerdo: '', seguimiento: '', estado: 'Pendiente', tinta: [] };
  const nuevo = id === 'nueva';
  return {
    titulo: nuevo ? 'Registrar visita' : 'Visita ' + (v.no || ''),
    html: `${volverA('#/visitas/historial', 'Historial de visitas')}
    <div class="ed-cab"><div><h2>Registro de visita</h2><p class="sub">Seguimiento breve de acompañamiento</p></div><span id="guardado" class="guardado" aria-live="polite"></span>
      <div class="rapidas noprint"><button class="btn" data-act="imprimir">${icon('imprimir', 18)} PDF</button>${nuevo ? '' : `<button class="btn peligro" data-act="eliminar" data-t="visitas" data-id="${v.id}">Eliminar</button>`}<a class="btn pri" href="#/visitas/historial">Listo</a></div></div>
    <p class="solo-imprimir">Zona Escolar 21, ciclo 2026-2027</p>
    <form id="ed" class="ed" onsubmit="return false">
      <section class="panel"><div class="dos">${selector('escuela', 'Escuela', opcionesEsc(), v.escuela)}${campo('fecha', 'Fecha', v.fecha, { type: 'date' })}</div>
        ${grupo('tipo', 'Tipo de visita', ['Observación', 'Asesoría', 'Seguimiento', 'Otra'], v.tipo, true)}
        ${campo('persona', 'Persona o grupo', v.persona)}
        ${area('proposito', 'Propósito', v.proposito, 3)}
        ${area('hallazgo', 'Hallazgo clave', v.hallazgo, 4)}
        ${area('acuerdo', 'Acuerdo o compromiso', v.acuerdo, 4)}
        <div class="dos">${campo('seguimiento', 'Fecha de seguimiento', v.seguimiento, { type: 'date' })}${grupo('estado', 'Estado', ['Pendiente', 'Atendido'], v.estado)}</div>
        <p class="dato"><span>Registro no.</span><b>${esc(v.no || 'Se asigna al guardar')}</b></p></section>
      <section class="panel">${tintaHTML(520, 'Apuntes a mano de la visita')}</section>
    </form>`,
    montar(root) {
      const ed = montarEditor($('#ed', root), 'visitas', v, { antes: o => { if (!o.no) o.no = siguienteNo('visitas', 'V-'); } });
      montarTinta($('.ink', root), v, 'tinta', ed.persistir);
    }
  };
}

function vHistorialVisitas(q) {
  return historial({
    q, titulo: 'Historial de visitas', tabla: 'visitas', volver: '#/visitas', volverTxt: 'Visitas', nueva: '#/visitas/nueva', nuevaTxt: 'Registrar visita',
    estados: ['Pendiente', 'Atendido'], cols: ['No.', 'Fecha', 'Escuela', 'Tipo', 'Persona o grupo', 'Propósito', 'Estado'],
    fila: v => `<tr data-go="#/visitas/${v.id}" tabindex="0"><td>${esc(v.no || '')}</td><td>${fmtFecha(v.fecha)}</td><td>${esc(nom(v.escuela))}</td><td>${esc((v.tipo || []).join(', '))}</td><td>${esc(v.persona)}</td><td class="wrap">${esc(v.proposito)}</td><td>${tagEstado(v.estado)}</td></tr>`
  });
}

function vSeguimientos() {
  const h = hoy();
  const rows = seguimientosPendientes().sort((a, b) => (a.seguimiento || '9999').localeCompare(b.seguimiento || '9999'));
  return {
    titulo: 'Seguimientos pendientes',
    html: `${volverA('#/visitas', 'Visitas')}<p class="intro">Acuerdos y compromisos por atender. Los vencidos aparecen primero.</p>
    <div class="tabla-w"><table class="tabla"><thead><tr><th>No.</th><th>Fecha de visita</th><th>Escuela</th><th>Acuerdo o compromiso</th><th>Fecha de seguimiento</th><th>Estado</th><th class="noprint"></th></tr></thead><tbody>
    ${rows.length ? rows.map(v => { const venc = v.seguimiento && v.seguimiento < h; return `<tr><td><a href="#/visitas/${v.id}">${esc(v.no || 'Abrir')}</a></td><td>${fmtFecha(v.fecha)}</td><td>${esc(nom(v.escuela))}</td><td class="wrap">${esc(v.acuerdo)}</td><td>${v.seguimiento ? fmtFecha(v.seguimiento) : 'Sin fecha'}${venc ? ' <span class="tag tarde">Vencido</span>' : ''}</td><td>${tagEstado(v.estado)}</td><td class="noprint"><button class="btn chico" data-act="atender" data-t="visitas" data-id="${v.id}">Marcar atendido</button></td></tr>`; }).join('') : '<tr><td colspan="7" class="vacio-td">No hay seguimientos pendientes.</td></tr>'}
    </tbody></table></div>`
  };
}

function vInstrumentos() {
  return {
    titulo: 'Instrumentos de acompañamiento',
    html: `${volverA('#/visitas', 'Visitas')}<p class="intro">Formatos y documentos para las visitas. Se abren en Google Docs.</p><div class="hubs">
      ${tarjeta({ icono: 'doc', titulo: 'Ficha de observación', texto: 'Observación y acompañamiento a la práctica docente', href: ENLACES.observacion })}
      ${tarjeta({ icono: 'doc', titulo: 'Sesión de asesoría', texto: 'Registro de asesoría, acuerdos y compromisos', href: ENLACES.asesoria })}</div>`
  };
}

/* =====================================================================
   INCIDENCIAS
   ===================================================================== */
function vIncidenciasHub() {
  return {
    titulo: 'Incidencias del personal',
    html: `<p class="intro">Control de permisos, ausencias y documentación, ciclo escolar 2026-2027.</p><div class="hubs">
      ${tarjeta({ icono: 'incidencias', titulo: 'Registrar incidencia', texto: 'Permisos, licencias, faltas y acuerdos', ruta: '#/incidencias/nueva' })}
      ${tarjeta({ icono: 'agenda', titulo: 'Historial de incidencias', texto: 'Consulta de permisos y ausencias registradas', ruta: '#/incidencias/historial', badge: lista('incidencias').length })}</div>`
  };
}

function vIncidencia(id, q) {
  let r = id === 'nueva' ? null : uno('incidencias', id);
  if (id !== 'nueva' && !r) return { titulo: 'Incidencia', html: volverA('#/incidencias', 'Incidencias') + vacio('No se encontró esta incidencia.') };
  if (!r) r = { id: uid(), personal: '', escuela: q.escuela || '', fecha: q.fecha || hoy(), tipo: '', aviso: '', documento: '', motivo: '', entrega: '', estado: 'Pendiente' };
  const nuevo = id === 'nueva';
  const personas = lista('personal').map(p => p.nombre).filter(Boolean);
  return {
    titulo: nuevo ? 'Registrar incidencia' : 'Incidencia ' + (r.no || ''),
    html: `${volverA('#/incidencias/historial', 'Historial de incidencias')}
    <div class="ed-cab"><div><h2>Registrar incidencia</h2><p class="sub">Control breve de permisos y ausencias del personal</p></div><span id="guardado" class="guardado" aria-live="polite"></span>
      <div class="rapidas noprint"><button class="btn" data-act="imprimir">${icon('imprimir', 18)} PDF</button>${nuevo ? '' : `<button class="btn peligro" data-act="eliminar" data-t="incidencias" data-id="${r.id}">Eliminar</button>`}<a class="btn pri" href="#/incidencias/historial">Listo</a></div></div>
    <p class="solo-imprimir">Zona Escolar 21, ciclo 2026-2027</p>
    <datalist id="lista-personal">${personas.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <form id="ed" class="ed una" onsubmit="return false"><section class="panel">
      ${campo('personal', 'Personal', r.personal, { list: 'lista-personal' })}
      <div class="dos">${selector('escuela', 'Escuela', opcionesEsc(), r.escuela)}${campo('fecha', 'Fecha de ausencia', r.fecha, { type: 'date' })}</div>
      ${grupo('tipo', 'Tipo de incidencia', ['Permiso', 'Licencia médica', 'Falta', 'Acuerdo con supervisión', 'Otra'], r.tipo)}
      ${grupo('aviso', 'Forma de aviso', ['Escrito', 'Teléfono', 'WhatsApp', 'Personalmente', 'No avisó'], r.aviso)}
      ${grupo('documento', 'Documento o justificante', ['Entregado', 'Pendiente', 'No aplica'], r.documento)}
      ${area('motivo', 'Motivo u observación', r.motivo, 4)}
      <div class="dos">${campo('entrega', 'Fecha de entrega del documento', r.entrega, { type: 'date' })}${grupo('estado', 'Estado', ['Pendiente', 'Cerrado'], r.estado)}</div>
      <p class="dato"><span>Incidencia no.</span><b>${esc(r.no || 'Se asigna al guardar')}</b></p></section></form>`,
    montar(root) { montarEditor($('#ed', root), 'incidencias', r, { antes: o => { if (!o.no) o.no = siguienteNo('incidencias', 'I-'); } }); }
  };
}

function vHistorialIncidencias(q) {
  return historial({
    q, titulo: 'Historial de incidencias', tabla: 'incidencias', volver: '#/incidencias', volverTxt: 'Incidencias', nueva: '#/incidencias/nueva', nuevaTxt: 'Registrar incidencia',
    estados: ['Pendiente', 'Cerrado'], cols: ['No.', 'Fecha', 'Personal', 'Escuela', 'Tipo', 'Aviso', 'Documento', 'Estado'],
    fila: i => `<tr data-go="#/incidencias/${i.id}" tabindex="0"><td>${esc(i.no || '')}</td><td>${fmtFecha(i.fecha)}</td><td>${esc(i.personal)}</td><td>${esc(nom(i.escuela))}</td><td>${esc(i.tipo)}</td><td>${esc(i.aviso)}</td><td>${esc(i.documento)}</td><td>${tagEstado(i.estado)}</td></tr>`
  });
}

/* =====================================================================
   PERSONAL
   ===================================================================== */
function vPersonal(q) {
  const fEsc = q.escuela || '';
  return {
    titulo: 'Personal',
    html: `<p class="intro">Personal adscrito a cada plantel, con teléfonos y correos para consulta rápida.</p>
    <div class="filtros noprint"><label class="f"><span>Escuela</span><select id="f-esc">${[['', 'Todas las escuelas'], ...escuelas().map(e => [e.id, e.nombre])].map(([v, t]) => `<option value="${esc(v)}"${v === fEsc ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="f grande"><span>Buscar</span><input id="f-txt" type="search" placeholder="Nombre o función" autocomplete="off"></label>
      <a class="btn" href="${esc(ENLACES.personal)}" target="_blank" rel="noopener">${icon('carpeta', 18)} Carpeta de documentos del personal</a>
      <a class="btn pri" href="#/personal/nuevo${fEsc ? '?escuela=' + encodeURIComponent(fEsc) : ''}">${icon('mas', 18)} Agregar persona</a></div>
    <div class="tabla-w"><table class="tabla"><thead><tr><th>Nombre</th><th>Función</th><th>Escuela</th><th>Teléfono</th><th>Correo</th></tr></thead><tbody id="filas"></tbody></table></div><p id="cuenta" class="nota"></p>`,
    montar(root) {
      const pintar = () => {
        const e = $('#f-esc', root).value, t = norm($('#f-txt', root).value);
        const rows = lista('personal').filter(p => (!e || p.escuela === e) && (!t || norm(textoDe(p)).includes(t))).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
        $('#filas', root).innerHTML = rows.length ? rows.map(p => `<tr data-go="#/personal/${p.id}" tabindex="0"><td>${esc(p.nombre)}</td><td>${esc(p.funcion)}</td><td>${esc(p.escuela ? nom(p.escuela) : 'Supervisión de zona')}</td><td>${p.telefono ? `<a class="enl" href="tel:${esc(p.telefono)}">${esc(p.telefono)}</a>` : ''}</td><td>${p.correo ? `<a class="enl" href="mailto:${esc(p.correo)}">${esc(p.correo)}</a>` : ''}</td></tr>`).join('') : `<tr><td colspan="5" class="vacio-td">${lista('personal').length ? 'Nadie coincide con el filtro.' : 'Aún no hay personal capturado. Agrega a la primera persona con el botón de arriba.'}</td></tr>`;
        $('#cuenta', root).textContent = rows.length + ' de ' + lista('personal').length + ' personas';
      };
      const zona = $('.filtros', root);
      zona.addEventListener('input', pintar); zona.addEventListener('change', pintar); pintar();
    }
  };
}

function vPersona(id, q) {
  let p = id === 'nuevo' ? null : uno('personal', id);
  if (id !== 'nuevo' && !p) return { titulo: 'Personal', html: volverA('#/personal', 'Personal') + vacio('No se encontró a esta persona.') };
  if (!p) p = { id: uid(), nombre: '', funcion: '', escuela: q.escuela || '', telefono: '', correo: '', notas: '' };
  const nuevo = id === 'nuevo';
  return {
    titulo: nuevo ? 'Agregar persona' : (p.nombre || 'Personal'),
    html: `${volverA('#/personal' + (p.escuela ? '?escuela=' + encodeURIComponent(p.escuela) : ''), 'Personal')}
    <div class="ed-cab"><h2>${nuevo ? 'Agregar persona' : esc(p.nombre || 'Personal')}</h2><span id="guardado" class="guardado" aria-live="polite"></span>
      <div class="rapidas noprint">${nuevo ? '' : `<button class="btn peligro" data-act="eliminar" data-t="personal" data-id="${p.id}">Eliminar</button>`}<a class="btn pri" href="#/personal">Listo</a></div></div>
    <datalist id="lista-funciones">${['Directora', 'Director', 'Docente', 'Acompañante musical', 'Intendente', 'Apoyo administrativo', 'Supervisora', 'Otro'].map(f => `<option value="${f}">`).join('')}</datalist>
    <form id="ed" class="ed una" onsubmit="return false"><section class="panel">
      ${campo('nombre', 'Nombre completo', p.nombre)}${campo('funcion', 'Función', p.funcion, { list: 'lista-funciones' })}${selector('escuela', 'Escuela', [['', 'Supervisión de zona'], ...escuelas().map(e => [e.id, e.nombre])], p.escuela)}
      <div class="dos">${campo('telefono', 'Teléfono', p.telefono, { type: 'tel', mode: 'tel' })}${campo('correo', 'Correo electrónico', p.correo, { type: 'email' })}</div>
      ${area('notas', 'Notas', p.notas, 4)}</section></form>`,
    montar(root) { montarEditor($('#ed', root), 'personal', p); }
  };
}

/* =====================================================================
   BIBLIOTECA
   ===================================================================== */
function vBiblioteca() {
  const docs = ref().docs || [];
  const porCat = {};
  docs.forEach(d => { (porCat[d.categoria || 'Otros'] = porCat[d.categoria || 'Otros'] || []).push(d); });
  return {
    titulo: 'Biblioteca',
    html: `<p class="intro">Documentos y recursos de consulta, ciclo escolar 2026-2027. Se abren en Google Drive.</p>
    <div class="hubs">${ENLACES.biblioteca.map(([t, s, u]) => tarjeta({ icono: 'carpeta', titulo: t, texto: s, href: u })).join('')}</div>
    <section class="panel"><h2>Documentos agregados en la hoja</h2>${docs.length ? Object.keys(porCat).sort().map(c => `<h3>${esc(c)}</h3><ul class="lista">${porCat[c].map(d => `<li><a href="${esc(d.enlace)}" target="_blank" rel="noopener"><span class="hub-ext">${icon('enlace', 16)}</span><span>${esc(d.titulo)}</span></a></li>`).join('')}</ul>`).join('') : '<p class="nota">Los documentos nuevos que se agreguen a la pestaña Documentos de la hoja aparecen aquí al sincronizar.</p>'}</section>
    <p class="nota">Para leer un documento sin internet, ábrelo en la aplicación de Google Drive y activa Disponible sin conexión.</p>`
  };
}

/* =====================================================================
   NOTAS
   ===================================================================== */
function vNotas(q) {
  const est = q.estado || 'Todas';
  const rows = lista('notas').filter(n => est === 'Todas' || n.estado === est).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id.localeCompare(a.id));
  return {
    titulo: 'Notas',
    html: `<p class="intro">Ideas, recordatorios y asuntos por retomar. Se puede escribir o dibujar con el lápiz.</p>
    <div class="filtros noprint"><nav class="chips" aria-label="Filtrar por estado">${['Todas', 'Pendiente', 'Importante', 'Resuelto'].map(s => `<a class="chip${s === est ? ' on' : ''}" href="#/notas${s === 'Todas' ? '' : '?estado=' + s}"><span>${s}</span></a>`).join('')}</nav>
      <a class="btn pri" href="#/notas/nueva">${icon('mas', 18)} Nota nueva</a></div>
    ${rows.length ? `<div class="notas-g">${rows.map(n => `<a class="nota-c" href="#/notas/${n.id}"><span class="nota-top"><b>${esc(n.tema || 'Sin tema')}</b>${tagEstado(n.estado)}</span><small>${fmtFecha(n.fecha)}${n.tinta && n.tinta.length ? ', con apuntes a mano' : ''}</small><p>${esc((n.texto || '').slice(0, 140))}</p></a>`).join('')}</div>` : vacio(est === 'Todas' ? 'Todavía no hay notas.' : 'No hay notas con este estado.', '<a class="btn pri" href="#/notas/nueva">Escribir la primera</a>')}`
  };
}

function vNota(id) {
  let n = id === 'nueva' ? null : uno('notas', id);
  if (id !== 'nueva' && !n) return { titulo: 'Nota', html: volverA('#/notas', 'Notas') + vacio('No se encontró esta nota.') };
  if (!n) n = { id: uid(), tema: '', fecha: hoy(), estado: 'Pendiente', texto: '', tinta: [], tintaH: 900 };
  const nuevo = id === 'nueva';
  return {
    titulo: nuevo ? 'Nota nueva' : (n.tema || 'Nota'),
    html: `${volverA('#/notas', 'Notas')}
    <div class="ed-cab"><h2>${nuevo ? 'Nota nueva' : esc(n.tema || 'Nota')}</h2><span id="guardado" class="guardado" aria-live="polite"></span>
      <div class="rapidas noprint"><button class="btn" data-act="imprimir">${icon('imprimir', 18)} PDF</button>${nuevo ? '' : `<button class="btn peligro" data-act="eliminar" data-t="notas" data-id="${n.id}">Eliminar</button>`}<a class="btn pri" href="#/notas">Listo</a></div></div>
    <form id="ed" class="ed apilado" onsubmit="return false">
      <section class="panel"><div class="dos">${campo('tema', 'Tema', n.tema)}${campo('fecha', 'Fecha', n.fecha, { type: 'date' })}</div>${grupo('estado', 'Estado', ['Pendiente', 'Importante', 'Resuelto'], n.estado)}${area('texto', 'Texto', n.texto, 8)}</section>
      <section class="panel"><div id="tinta-w">${tintaHTML(n.tintaH || 900, 'Escribir o dibujar')}</div><button type="button" class="btn chico noprint" data-act="mas-espacio">Agregar espacio abajo</button></section></form>`,
    montar(root) {
      const ed = montarEditor($('#ed', root), 'notas', n);
      montarTinta($('.ink', root), n, 'tinta', ed.persistir);
      $('#ed', root).addEventListener('click', e => {
        if (!e.target.closest('[data-act="mas-espacio"]')) return;
        n.tintaH = (n.tintaH || 900) + 400; ed.persistir();
        $('#tinta-w', root).innerHTML = tintaHTML(n.tintaH, 'Escribir o dibujar');
        montarTinta($('.ink', root), n, 'tinta', ed.persistir);
      });
    }
  };
}

/* =====================================================================
   AJUSTES
   ===================================================================== */
function vAjustes() {
  const c = cfg();
  const ultimo = c.lastSync ? new Date(c.lastSync).toLocaleString('es-MX') : 'Todavía no se ha sincronizado';
  return {
    titulo: 'Ajustes',
    html: `<div class="ajustes">
    <section class="panel"><h2>Hoja de Google</h2><p class="nota">Aquí se conecta la agenda con la hoja de cálculo donde se guardan los registros. Se hace una sola vez.</p>
      <form id="cfg" onsubmit="return false">${campo('url', 'Dirección de la aplicación web (Apps Script)', c.url || '', { ph: 'https://script.google.com/macros/s/.../exec' })}${campo('token', 'Clave', c.token || '')}${campo('owner', 'Nombre que aparece en Inicio', c.owner || 'Catalina Teroba Jaime')}</form>
      <div class="acc-fila"><button class="btn pri" data-act="sync">${icon('sync', 18)} Sincronizar ahora</button></div>
      <p class="dato"><span>Última sincronización</span><b>${esc(ultimo)}</b></p>
      <p class="dato"><span>Cambios por enviar</span><b>${pendientesDeEnviar()}</b></p></section>
    <section class="panel"><h2>Copia de seguridad</h2><p class="nota">Guarda un archivo con todo lo capturado en esta tablet. Sirve como respaldo adicional a la hoja de Google.</p>
      <div class="acc-fila"><button class="btn" data-act="exportar">Descargar copia</button><label class="btn">Restaurar desde un archivo<input id="imp" type="file" accept="application/json,.json" hidden></label></div></section>
    <section class="panel"><h2>Instalar en la tablet</h2><p>Abre esta dirección en Chrome, toca el menú de tres puntos y elige Instalar aplicación o Añadir a la pantalla de inicio. Queda con su propio ícono y abre sin internet.</p>
      <p class="dato"><span>Versión</span><b>${VERSION}</b></p>${dbFalla ? '<p class="alerta-p">Este navegador no permite guardar datos locales. Lo que se escriba se perderá al cerrar.</p>' : ''}</section></div>`,
    montar(root) {
      const f = $('#cfg', root);
      const val = n => $('[name="' + n + '"]', f).value.trim();
      const guardarCfg = () => { const o = cfg(); o.url = val('url'); o.token = val('token'); o.owner = val('owner'); setCfg(o); pintarChip(); };
      f.addEventListener('change', guardarCfg); f.addEventListener('input', debounce(guardarCfg, 600));
      limpiezas.push(guardarCfg);
      $('#imp', root).addEventListener('change', async ev => {
        const file = ev.target.files[0]; if (!file) return;
        try { const n = await importarCopia(file); toast(n + ' registros restaurados.'); render(); } catch (e) { toast('No se pudo leer el archivo: ' + e.message); }
      });
    }
  };
}

/* =====================================================================
   BÚSQUEDA GLOBAL
   ===================================================================== */
function vBuscar(q) {
  const texto = (q.texto || '').trim(), t = norm(texto);
  if (t.length < 2) return { titulo: 'Buscar', html: vacio('Escribe al menos dos letras para buscar en escuelas, visitas, incidencias, personal, notas, agenda y biblioteca.') };
  const g = [];
  const dentro = (o) => norm(textoDe(o)).includes(t);
  const add = (nombre, items) => { if (items.length) g.push([nombre, items]); };
  add('Escuelas', escuelas().filter(dentro).map(e => ({ t: e.nombre, s: (e.cct || e.id) + (e.municipio ? ', ' + e.municipio : ''), r: '#/escuelas/' + e.id })));
  add('Visitas', lista('visitas').filter(dentro).sort(ordenFecha).map(v => ({ t: (v.no || 'Visita') + ', ' + nom(v.escuela), s: fmtFecha(v.fecha) + (v.proposito ? ', ' + v.proposito : ''), r: '#/visitas/' + v.id })));
  add('Incidencias', lista('incidencias').filter(dentro).sort(ordenFecha).map(i => ({ t: (i.no || 'Incidencia') + ', ' + (i.personal || 'sin nombre'), s: fmtFecha(i.fecha) + ', ' + nom(i.escuela), r: '#/incidencias/' + i.id })));
  add('Personal', lista('personal').filter(dentro).map(p => ({ t: p.nombre || 'Sin nombre', s: (p.funcion || '') + (p.escuela ? ', ' + nom(p.escuela) : ''), r: '#/personal/' + p.id })));
  add('Notas', lista('notas').filter(dentro).sort(ordenFecha).map(n => ({ t: n.tema || 'Sin tema', s: fmtFecha(n.fecha) + ', ' + (n.texto || '').slice(0, 80), r: '#/notas/' + n.id })));
  add('Agenda', lista('eventos').filter(dentro).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(e => ({ t: e.texto, s: fmtFecha(e.fecha) + ', ' + (NOMBRE_TIPO[e.tipo] || ''), r: '#/agenda/' + e.fecha.slice(0, 7) })));
  const rf = ref();
  add('Documentos de la hoja', (rf.docs || []).filter(d => norm(d.titulo + ' ' + d.categoria).includes(t)).map(d => ({ t: d.titulo, s: d.categoria || '', h: d.enlace })));
  add('Carpetas de la biblioteca', ENLACES.biblioteca.filter(([a, b]) => norm(a + ' ' + b).includes(t)).map(([a, b, u]) => ({ t: a, s: b, h: u })));
  add('Indicadores de la zona', (rf.stats || []).filter(s => norm(s.indicador + ' ' + s.valor).includes(t)).map(s => ({ t: s.indicador + ': ' + s.valor, s: (s.escuela ? nom(s.escuela) + ', ' : '') + (s.corte || ''), r: '#/inicio' })));
  const total = g.reduce((s, [, a]) => s + a.length, 0);
  return {
    titulo: 'Resultados de la búsqueda',
    html: `<p class="intro">${total} resultado${total === 1 ? '' : 's'} para <b>${esc(texto)}</b>.</p>` + (total ? g.map(([n, items]) => `<section class="panel"><h2>${n} <small>${items.length}</small></h2><ul class="lista">${items.slice(0, 15).map(i => `<li><a href="${esc(i.h || i.r)}"${i.h ? ' target="_blank" rel="noopener"' : ''}><b>${esc(i.t)}</b><span>${esc(i.s)}</span></a></li>`).join('')}</ul></section>`).join('') : vacio('Nada coincide. Prueba con otra palabra o con menos letras.'))
  };
}
