/* okno-bridge.js — API к построителю ОкноСофт. Вставлять в контекст страницы. */
(() => {
  const VERSION = 2;
  if (window.okno && window.okno.v >= VERSION) return 'already injected';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();

  const editor = () => (window.paper && window.paper.project) ? window.paper : null;
  const canvas = () => $('#paper-view-1') || $$('canvas[id^="paper-view"]')[0] || null;

  /* ---------- синтетические события мыши ---------- */
  function fire(el, type, x, y, buttons = 0) {
    const base = { bubbles: true, cancelable: true, composed: true, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons, detail: 1 };
    const ev = type.startsWith('pointer')
      ? new PointerEvent(type, { ...base, pointerId: 1, pointerType: 'mouse',
                                 isPrimary: true, width: 1, height: 1 })
      : new MouseEvent(type, base);
    el.dispatchEvent(ev);
  }

  async function clickAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) throw new Error('нет элемента в точке ' + x + ',' + y);
    const seq = [['pointerover',0],['pointermove',0],['mousemove',0],
                 ['pointerdown',1],['mousedown',1],['pointerup',0],['mouseup',0],['click',0]];
    for (const [t, b] of seq) { fire(el, t, x, y, b); await sleep(12); }
    return el.tagName + '#' + el.id + '.' + el.className;
  }

  async function clickEl(el) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) throw new Error('элемент не виден');
    return clickAt(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
  }

  /* ---------- размерные надписи ---------- */
  function toClient(pt) {
    const e = editor(), c = canvas();
    if (!e || !c) return null;
    const v = e.project.view.projectToView(pt);
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.left + v.x), y: Math.round(r.top + v.y) };
  }

  function pointTexts() {
    const e = editor(), res = [];
    if (!e) return res;
    const walk = it => {
      if (it.className === 'PointText') {
        const text = String(it.content ?? '').trim();
        const c = it.bounds && it.bounds.center;
        res.push({ text, numeric: num(text),
                   rotation: Math.round(((it.rotation || 0) % 180 + 180) % 180),
                   client: c ? toClient(c) : null });
      }
      (it.children || []).forEach(walk);
    };
    (e.project.layers || []).forEach(l => (l.children || []).forEach(walk));
    return res;
  }

  const dims = () => pointTexts().filter(t => t.numeric !== null && t.client);

  function sizeLabels() {
    const d = dims();
    if (!d.length) return { width: null, height: null, all: [] };
    const vertical   = d.filter(t => Math.abs(t.rotation - 90) < 20);
    const horizontal = d.filter(t => Math.abs(t.rotation) < 20 || Math.abs(t.rotation - 180) < 20);
    const byY = d.slice().sort((a, b) => a.client.y - b.client.y);
    return { height: vertical[0] || byY[0],
             width:  horizontal[0] || byY[byY.length - 1],
             all: d };
  }

  /* ---------- вписать чертёж в окно ---------- */
  function fitView(pad = 0.8) {
    const e = editor(); if (!e) return false;
    const v = e.project.view, b = e.project.activeLayer.bounds;
    if (!b || !b.width || !b.height) return false;
    v.zoom = Math.min(v.bounds.width / b.width, v.bounds.height / b.height) * pad;
    v.center = b.center;
    return { zoom: v.zoom, center: { x: v.center.x, y: v.center.y } };
  }

  /* ---------- установка габаритов ---------- */
  async function setSize(width, height) {
    const out = { asked: { width, height }, steps: [] };
    fitView();
    await sleep(150);
    for (const [which, value] of [['width', width], ['height', height]]) {
      if (value == null) continue;
      const label = sizeLabels()[which];
      if (!label) throw new Error('размерная надпись «' + which + '» не найдена');
      if (num(label.text) === value) { out.steps.push({ which, skipped: 'already', text: label.text }); continue; }

      await clickAt(label.client.x, label.client.y);
      let input = null;
      for (let i = 0; i < 40 && !input; i++) { await sleep(50); input = $('input.sz_input'); }
      if (!input) throw new Error('поле ввода размера не открылось (' + which + ')');

      input.focus();
      input.value = String(value);
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      await sleep(800);
      fitView();
      out.steps.push({ which, before: label.text, after: sizeLabels()[which]?.text ?? null });
    }
    const after = sizeLabels();
    out.after = { width: after.width?.text ?? null, height: after.height?.text ?? null };
    const checks = [];
    if (width  != null) checks.push(String(out.after.width)  === String(width));
    if (height != null) checks.push(String(out.after.height) === String(height));
    out.ok = checks.length > 0 && checks.every(Boolean);
    return out;
  }

  /* ---------- строки заказа из грида ---------- */
  function rows() {
    return $$('table.obj tr')
      .map(tr => [...tr.querySelectorAll('td')].map(td => norm(td.textContent)))
      .filter(c => c.length >= 5 && /^\d+$/.test(c[0] || ''))
      .map(c => ({ row: +c[0], nom: c[1], characteristic: c[2], size: c[3],
                   area: c[4], mass: c[5], qty: c[6], price: c[7], amount: c[9] }));
  }

  async function clickTitle(re) {
    const rx = re instanceof RegExp ? re : new RegExp(re, 'i');
    const el = $$('[title]').find(e => rx.test(e.title));
    if (!el) throw new Error('кнопка не найдена: ' + re);
    await clickEl(el);
    return el.title;
  }

  async function clickRow(index) {
    const tr = $$('table.obj tr').filter(t => t.querySelectorAll('td').length >= 5)[index];
    if (!tr) throw new Error('строка грида не найдена: ' + index);
    await clickEl(tr.querySelector('td'));
    return norm(tr.textContent).slice(0, 120);
  }

  async function save() {
    await clickTitle(/^Рассчитать, записать и закрыть/);
    return 'ok';
  }

  /* ---------- удаление строки заказа: выделить + Delete в грид ---------- */
  async function delRow(rowId) {
    const g = (window.grid || $$('.dhx_grid')[0] || {}).grid || window.grid;
    if (!g || !g.selectRowById) throw new Error('грид не найден');
    g.selectRowById(rowId);
    const host = $('.gridbox') || $('.dhx_cell') || document.body;
    host.focus && host.focus();
    for (const t of ['keydown', 'keyup']) {
      host.dispatchEvent(new KeyboardEvent(t, { key: 'Delete', code: 'Delete', keyCode: 46, which: 46, bubbles: true }));
      document.body.dispatchEvent(new KeyboardEvent(t, { key: 'Delete', code: 'Delete', keyCode: 46, which: 46, bubbles: true }));
    }
    await sleep(400);
    return { rowId, rowsAfter: g.getRowsNum ? g.getRowsNum() : null };
  }

  function status() {
    return {
      v: VERSION,
      url: location.href,
      editorOpen: !!editor(),
      canvas: canvas() ? { id: canvas().id, w: canvas().width, h: canvas().height } : null,
      dims: dims().map(d => d.text),
      szInput: !!$('input.sz_input'),
      rows: rows().length,
      modal: !!$('.dhx_modal_cover'),
      template: localStorage.getItem('wb_template_block_calc_order'),
      lastSys: localStorage.getItem('wb_editor_last_sys'),
    };
  }

  window.okno = { v: VERSION, status, dims, sizeLabels, setSize, fitView,
                  clickAt, clickEl, clickTitle, clickRow, delRow, rows, save,
                  editor, canvas, sleep };
  return 'okno v' + VERSION;
})();