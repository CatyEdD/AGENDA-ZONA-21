'use strict';
/* Escritura a mano. Los trazos se guardan como datos (no como imagen), en una hoja lógica de 1000 unidades de ancho. */

const INK_COLORES = [['#003352', 'Azul'], ['#1a1a1a', 'Negro'], ['#b0432f', 'Rojo'], ['#2f7a45', 'Verde']];

function tintaHTML(alto, titulo) {
  return `<div class="ink" data-alto="${alto}">
    <div class="ink-bar noprint" role="toolbar" aria-label="Herramientas de escritura a mano">
      <span class="ink-t">${esc(titulo || 'Apuntes a mano')}</span>
      <span class="ink-g" data-g="color">${INK_COLORES.map((c, i) => `<button type="button" class="ink-c${i === 0 ? ' on' : ''}" data-color="${c[0]}" style="--c:${c[0]}" aria-label="${c[1]}" aria-pressed="${i === 0}"></button>`).join('')}</span>
      <span class="ink-g"><button type="button" class="ink-b on" data-ancho="3" aria-pressed="true">Fino</button><button type="button" class="ink-b" data-ancho="7" aria-pressed="false">Grueso</button></span>
      <span class="ink-g"><button type="button" class="ink-b" data-tool="goma" aria-pressed="false">Goma</button><button type="button" class="ink-b" data-acc="deshacer">Deshacer</button><button type="button" class="ink-b" data-acc="limpiar">Borrar todo</button></span>
      <span class="ink-g"><button type="button" class="ink-b" data-acc="dedo" aria-pressed="false">Dedo</button></span>
    </div>
    <canvas class="ink-cv" aria-label="Zona para escribir a mano"></canvas>
  </div>`;
}

function montarTinta(el, obj, campo, alCambiar) {
  const cv = $('canvas', el), ctx = cv.getContext('2d');
  const LW = 1000;
  const LH = () => obj.tintaH || +el.dataset.alto || 420;
  const trazos = Array.isArray(obj[campo]) ? obj[campo] : (obj[campo] = []);
  let herr = 'pluma', color = INK_COLORES[0][0], ancho = 3, cur = null, borrando = false, cambiado = false;
  const dedoPref = () => localStorage.getItem('z21dedo');
  const dedoOn = () => dedoPref() !== '0';

  function ajustar() {
    const w = cv.clientWidth || el.clientWidth || 800;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const h = w * LH() / LW;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.height = h + 'px';
    cv.style.backgroundSize = '100% ' + (w * 44 / LW) + 'px';
    redibujar();
  }
  const k = () => cv.width / LW;

  function trazo(s) {
    const q = k(); ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const p = s.p;
    if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0] * q, p[0][1] * q, s.w * q / 2, 0, 7); ctx.fill(); return; }
    for (let i = 1; i < p.length; i++) {
      const pr = (p[i][2] == null ? 50 : p[i][2]) / 100;
      ctx.lineWidth = s.w * q * (0.55 + 0.9 * pr);
      ctx.beginPath(); ctx.moveTo(p[i - 1][0] * q, p[i - 1][1] * q); ctx.lineTo(p[i][0] * q, p[i][1] * q); ctx.stroke();
    }
  }
  function redibujar() { ctx.clearRect(0, 0, cv.width, cv.height); trazos.forEach(trazo); }

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return [Math.round((e.clientX - r.left) * LW / r.width), Math.round((e.clientY - r.top) * LW / r.width)];
  }
  function borrarEn(pt) {
    const rad = 16; let hubo = false;
    for (let i = trazos.length - 1; i >= 0; i--) {
      if (trazos[i].p.some(q => Math.abs(q[0] - pt[0]) < rad && Math.abs(q[1] - pt[1]) < rad)) { trazos.splice(i, 1); hubo = true; }
    }
    if (hubo) { redibujar(); cambiado = true; }
  }
  function terminar() { if (cambiado) { cambiado = false; obj[campo] = trazos; alCambiar && alCambiar(); const kb = JSON.stringify(trazos).length; if (kb > 150000) toast('Esta página de apuntes ya es muy pesada. Conviene continuar en una nota nueva.'); } }

  cv.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if ((t && t.touchType === 'stylus') || dedoOn()) e.preventDefault();
  }, { passive: false });

  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen' && dedoPref() === null) localStorage.setItem('z21dedo', '0');
    if (e.pointerType === 'touch' && !dedoOn()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignorar */ }
    const pt = pos(e);
    if (herr === 'goma') { borrando = true; borrarEn(pt); return; }
    const pr = e.pointerType === 'pen' ? Math.round((e.pressure || 0.5) * 100) : 50;
    cur = { c: color, w: ancho, p: [[pt[0], pt[1], pr]] };
    trazos.push(cur); trazo(cur); cambiado = true;
  });
  cv.addEventListener('pointermove', e => {
    if (borrando) { borrarEn(pos(e)); return; }
    if (!cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const pt = pos(ev), last = cur.p[cur.p.length - 1];
      if (Math.abs(pt[0] - last[0]) + Math.abs(pt[1] - last[1]) < 2) continue;
      const pr = ev.pointerType === 'pen' ? Math.round((ev.pressure || 0.5) * 100) : 50;
      cur.p.push([pt[0], pt[1], pr]);
      const q = k(), n = cur.p.length;
      ctx.strokeStyle = cur.c; ctx.lineCap = 'round';
      ctx.lineWidth = cur.w * q * (0.55 + 0.9 * pr / 100);
      ctx.beginPath(); ctx.moveTo(cur.p[n - 2][0] * q, cur.p[n - 2][1] * q); ctx.lineTo(pt[0] * q, pt[1] * q); ctx.stroke();
    }
  });
  const fin = () => { cur = null; borrando = false; terminar(); };
  cv.addEventListener('pointerup', fin);
  cv.addEventListener('pointercancel', () => { if (cur && cur.p.length < 2) { /* gesto de desplazamiento: se descarta */ trazos.pop(); cambiado = false; redibujar(); } cur = null; borrando = false; terminar(); });

  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.color) {
      color = b.dataset.color; herr = 'pluma';
      $$('[data-color]', el).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      $$('[data-tool]', el).forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', false); });
    } else if (b.dataset.ancho) {
      ancho = +b.dataset.ancho;
      $$('[data-ancho]', el).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    } else if (b.dataset.tool === 'goma') {
      herr = herr === 'goma' ? 'pluma' : 'goma';
      b.classList.toggle('on', herr === 'goma'); b.setAttribute('aria-pressed', herr === 'goma');
    } else if (b.dataset.acc === 'deshacer') {
      if (trazos.length) { trazos.pop(); redibujar(); cambiado = true; terminar(); }
    } else if (b.dataset.acc === 'limpiar') {
      if (trazos.length && confirm('¿Borrar todo lo escrito a mano en este espacio?')) { trazos.length = 0; redibujar(); cambiado = true; terminar(); }
    } else if (b.dataset.acc === 'dedo') {
      localStorage.setItem('z21dedo', dedoOn() ? '0' : '1'); pintarDedo();
      toast(dedoOn() ? 'Escribes con el dedo y con el lápiz.' : 'Solo el lápiz escribe. El dedo desplaza la pantalla.');
    }
  });
  function pintarDedo() { const b = $('[data-acc="dedo"]', el); if (b) { b.classList.toggle('on', dedoOn()); b.setAttribute('aria-pressed', dedoOn()); b.textContent = dedoOn() ? 'Dedo: sí' : 'Dedo: no'; } }
  pintarDedo();

  if (window.ResizeObserver) { let w0 = 0; new ResizeObserver(() => { const w = cv.clientWidth; if (w && w !== w0) { w0 = w; ajustar(); } }).observe(cv); }
  ajustar();
  return { redibujar: ajustar };
}
