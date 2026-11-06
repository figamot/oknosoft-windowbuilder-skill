# Примеры вызовов evaluate_js

Все вызовы короткие, без вложенных кавычек. `pageId` подставляет ваш инструмент.

## 1. Проверка связи

```js
typeof window.okno === 'object' && window.okno.v || 0
```

```js
window.okno.status()
```

## 2. Чертёж

```js
window.okno.fitView()
```

```js
window.okno.dims()
```

## 3. Габариты изделия

```js
window.okno.setSize(2040, 2620)
```

```js
window.okno.setSize(null, 2200)
```

Без кликов по канве (тот же обработчик, что Enter в поле размера):

```js
let dl = paper.project.activeLayer.children.dimlns.children;
const R = dl.find(d => d.pos === 'right');
R.sizes_wnd({wnd: R, size: 2620, name: 'auto'});
```

```js
let dl = paper.project.activeLayer.children.dimlns.children;
const B = dl.find(d => d.pos === 'bottom');
B.sizes_wnd({wnd: B, size: 2040, name: 'auto'});
```

## 4. Импост от профиля до профиля

```js
document.querySelector('[title="Добавить профиль"]').click()
```

```js
const c = paper.project.contours[0];
const ps = [...c.children.profiles.children];
const top = ps.find(p => p.elm_type.name === 'Рама' && Math.round(p.bounds.bottom) === 0 && p.bounds.width > 500);
const bot = ps.find(p => p.elm_type.name === 'Рама' && Math.round(p.bounds.top) === -2620 && p.bounds.width > 500);
const a = top.generatrix.getNearestPoint(new paper.Point(690, -43));
const b = bot.generatrix.getNearestPoint(new paper.Point(690, -2577));
const t = paper.tools.find(z => z.constructor.name === 'ToolPen');
t.path = new paper.Path({segments: [a, b], insert: false});
t.point1 = a.clone(); t.mode = 'create'; t.start_binded = true; t.addl_hit = null;
t.on_mouseup({event: null, modifiers: {}});
```

## 5. Створка (атомарно, один вызов)

```js
const c = paper.project.contours[0];
const f = c.children.fillings.children.find(z => Math.round(z.path.bounds.width) === 1230 && z.path.bounds.height > 2000);
c.activate();
const leaf = f.create_leaf($p.cat.furns.get('44624c42-0c4d-11ed-9611-84f1e8809c54'));
leaf._row.direction = $p.enm.open_directions.Левое;
```

## 6. Накладки

```js
paper.project.contours[0].activate()
```

```js
await $p.ui.dialogs.region_layer(paper.project)
```

```js
const c = paper.project.contours[0];
const row = [...c.children.topLayers.children, ...c.children.bottomLayers.children].find(l => l.kind === 5);
const ins = $p.cat.inserts.by_name('Накладка импоста 124');
const Ed = paper.constructor;
const pr = [...c.children.profiles.children].filter(z => z.elm_type.name === 'Импост');
for (const p of pr) {
  const g = new paper.Path({segments: [
    [p.generatrix.firstSegment.point.x, p.generatrix.firstSegment.point.y],
    [p.generatrix.lastSegment.point.x, p.generatrix.lastSegment.point.y]
  ], insert: false});
  new Ed.ProfileRegion({layer: row, parent: row.children.profiles, generatrix: g, proto: {inset: ins}});
}
```

## 7. Сохранение

```js
await paper.project.save_coordinates({save: true, close: true})
```

## 8. Заказ

```js
window.okno.rows()
```

```js
window.okno.save()
```

```js
const d = await $p.doc.calc_order.get(location.href.match(/order=([0-9a-f-]+)/)[1], 'promise');
const r = [...d.production].pop();
r.note = 'ОК-5'; r.quantity = 510;
await d.recalc(); await d.save();
```

## 9. Проверка ошибок примыкания

```js
const ox = paper.project.contours[0];
const sp = await ox.specification;
let bad = 0;
sp.forEach(s => { if (/Ошибк/i.test(s.nom.name)) bad++; });
```

## 10. Геометрия и слои

```js
paper.project.activeLayer.children.fillings.map(f => {
  const b = f.path.bounds;
  return { w: Math.round(b.width), h: Math.round(b.height),
           x: Math.round(b.left), y: Math.round(b.bottom) };
})
```

```js
paper.project.activeLayer.children.map(c => c.name + ' ' + c.constructor.name)
```

```js
paper.project.contours[0].activate()
```

```js
paper._undo.back()
```

## 11. Диагностика

```js
!!document.querySelector('.dhx_modal_cover')
```

```js
window.$p.doc.calc_order._modified
```