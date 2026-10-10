/**
 * Agenda de supervisión, Zona 21. Sincronización con una hoja de Google.
 *
 * Instalación (una sola vez):
 * 1. Crear una hoja de cálculo nueva en Google Drive.
 * 2. Extensiones > Apps Script. Borrar lo que haya y pegar todo este archivo.
 * 3. Elegir la función "configurar" y tocar Ejecutar. Aceptar los permisos.
 *    Esto crea las pestañas y una Clave en la pestaña Config.
 * 4. Implementar > Nueva implementación > Aplicación web.
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
 * 5. Copiar la URL que termina en /exec. Esa URL y la Clave de la pestaña Config
 *    se escriben en Ajustes dentro de la agenda.
 *
 * Pestañas:
 * - Registros: la usa la agenda. No se edita a mano.
 * - Estadisticas: columnas Indicador, Valor, Escuela (CCT, opcional), Corte. Se llena a mano y aparece en Inicio.
 * - Documentos: columnas Titulo, Categoria, Enlace. Se llena a mano y aparece en Biblioteca.
 */

var H_REG = ['clave', 'tabla', 'id', 'u', 's', 'x', 'j0', 'j1', 'j2', 'j3', 'j4'];
var TROZO = 45000;   // una celda de Google admite 50 000 caracteres
var TROZOS = 5;

function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reg = hoja_(ss, 'Registros', H_REG);
  reg.getRange('A:K').setNumberFormat('@');
  reg.setFrozenRows(1);
  hoja_(ss, 'Estadisticas', ['Indicador', 'Valor', 'Escuela', 'Corte']);
  hoja_(ss, 'Documentos', ['Titulo', 'Categoria', 'Enlace']);
  var cfg = hoja_(ss, 'Config', ['Dato', 'Valor']);
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    props.setProperty('TOKEN', token);
  }
  cfg.getRange(2, 1, 1, 2).setValues([['Clave', token]]);
  cfg.getRange(3, 1, 1, 2).setValues([['Importante', 'La clave se escribe en Ajustes de la agenda. No la compartas.']]);
  SpreadsheetApp.getActive().toast('Listo. La clave está en la pestaña Config.');
}

function hoja_(ss, nombre, encabezado) {
  var sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, encabezado.length).setValues([encabezado]).setFontWeight('bold');
  return sh;
}

function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return salida_({ ok: true, mensaje: 'Agenda Zona 21 lista' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var req = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || req.token !== token) return salida_({ ok: false, error: 'Clave incorrecta' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('Registros');
    if (!sh) return salida_({ ok: false, error: 'Falta la pestaña Registros. Ejecuta configurar.' });

    var ahora = Date.now();
    var ultima = sh.getLastRow();
    var datos = ultima > 1 ? sh.getRange(2, 1, ultima - 1, H_REG.length).getValues() : [];
    var indice = {};
    datos.forEach(function (r, i) { indice[r[0]] = i; });

    var cambio = false, omitidos = [];
    (req.changes || []).forEach(function (c) {
      var clave = c.t + ':' + c.id;
      var json = JSON.stringify(c.d || {});
      if (json.length > TROZO * TROZOS) { omitidos.push(clave); return; }   // demasiado grande, se omite y se avisa
      var fila = [clave, c.t, c.id, c.u, ahora, c.x ? 1 : 0];
      for (var k = 0; k < TROZOS; k++) fila.push(json.substr(k * TROZO, TROZO));
      if (clave in indice) {
        if (Number(datos[indice[clave]][3]) >= c.u) return;   // lo guardado es más reciente
        datos[indice[clave]] = fila;
      } else {
        indice[clave] = datos.length;
        datos.push(fila);
      }
      cambio = true;
    });
    if (cambio && datos.length) sh.getRange(2, 1, datos.length, H_REG.length).setValues(datos);

    var desde = Number(req.since) || 0;
    var cambios = [];
    datos.forEach(function (r) {
      if (Number(r[4]) > desde) {
        var clave = String(r[0]), p = clave.indexOf(':');
        var json = [r[6], r[7], r[8], r[9], r[10]].join('');
        var d = {};
        try { d = json ? JSON.parse(json) : {}; } catch (err) { d = {}; }
        cambios.push({ t: clave.slice(0, p), id: clave.slice(p + 1), d: d, u: Number(r[3]), x: Number(r[5]) ? 1 : 0 });
      }
    });

    return salida_({ ok: true, now: ahora, changes: cambios, omitidos: omitidos, ref: referencia_(ss) });
  } catch (err) {
    return salida_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function referencia_(ss) {
  var stats = [], docs = [];
  var a = ss.getSheetByName('Estadisticas');
  if (a && a.getLastRow() > 1) {
    a.getRange(2, 1, a.getLastRow() - 1, 4).getDisplayValues().forEach(function (r) {
      if (r[0] && r[1]) stats.push({ indicador: r[0], valor: r[1], escuela: r[2], corte: r[3] });
    });
  }
  var b = ss.getSheetByName('Documentos');
  if (b && b.getLastRow() > 1) {
    b.getRange(2, 1, b.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      if (r[0] && r[2]) docs.push({ titulo: r[0], categoria: r[1], enlace: r[2] });
    });
  }
  return { stats: stats, docs: docs };
}
