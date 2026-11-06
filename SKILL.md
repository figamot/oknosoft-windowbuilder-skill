Скилл собран и уже в буфере обмена (8 677 символов) — можно вставить в `oknosoft-windowbuilder-skill/SKILL.md`. Вот его текст:

---

# SKILL: ОкноСофт / windowbuilder — автоматизация построителя

Версия 9 · проверено на заказе №ЕСБМИ000005 (19 изделий, 1103 шт, 4523,79 м², ошибок примыкания 0).

## 0. Правила (нарушать нельзя)

1. **Не перезагружать и не обновлять страницу построителя** — незаписанное изделие теряется. Сначала «Рассчитать, записать и закрыть» (дискетка), только потом уходить.
2. **Один вызов `evaluate_js` — одно действие.** Длинный JS с вложенными кавычками ломается → «некорректный вызов инструмента».
3. **Два неудачных шага подряд → сменить подход или спросить пользователя.** Не крутиться по кругу.
4. **Проверять результат по данным модели/базы, а не по памяти.**
5. **После каждого изделия — сохранять.** Сообщение «объект изменён другим процессом» часто ложное: проверять `_rev` в CouchDB.
6. Марка — в поле «Комментарий» строки заказа, количество — по ТЗ.
7. Открывание створок — **Левое** (пользователь поправит сам).
8. Система для текущего ТЗ — **«Окно деревоалюминиевое с увел. штапиком "ОКВУД"»**.

## 1. Доступ

- Построитель: `/builder/<ref характеристики>?order=<ref заказа>`.
- `ref` брать **из грида заказа** (`doc.composition` ненадёжен, часто 0 строк).
- Мастер создания: `/templates/?action=new&order=<ref>` — **только в том же табе**; в новом табе слетает сессия («Вход в систему», 406 proxy).
- Мост `okno-bridge.js` не переживает перезагрузку, `window.paper` — переживает.

## 2. Цикл на одно изделие (≈10 вызовов, проверено на 19 изделиях)

1. `location.href='/templates/?action=new&order=<ref>'` (в том же табе).
2. Ждать 3.5–4.5 с. `document.querySelectorAll('input[type=checkbox]')[0].click()` → кнопка «ДАЛЕЕ».
3. Клик по `div` с точным текстом `Окно деревоалюминиевое с увел. штапиком "ОКВУД"` → «Завершить».
4. Ждать ~4.5 с → `paper` готов, открыт `/builder/<ref>?order=…&action=new`.
5. **Габариты:**

```js
let dl = paper.project.activeLayer.children.dimlns.children;
const R = dl.find(d => d.pos === 'right');
R.sizes_wnd({wnd: R, size: H, name: 'auto'});
dl = paper.project.activeLayer.children.dimlns.children;   // перечитать!
const B = dl.find(d => d.pos === 'bottom');
B.sizes_wnd({wnd: B, size: W, name: 'auto'});
```

6. **Импосты** (по одному, пауза ≥1200 мс):

```js
document.querySelector('[title="Добавить профиль"]').click();  // paper.tool = ToolPen, elm_type='Импост'
const c = paper.project.contours[0];
const ps = [...c.children.profiles.children];
const top = ps.find(p => p.elm_type.name === 'Рама' && Math.round(p.bounds.bottom) === 0 && p.bounds.width > 500);
const bot = ps.find(p => p.elm_type.name === 'Рама' && Math.round(p.bounds.top) === -H && p.bounds.width > 500);
const a = top.generatrix.getNearestPoint(new paper.Point(x, -43));
const b = bot.generatrix.getNearestPoint(new paper.Point(x, -(H - 43)));
const t = paper.tools.find(z => z.constructor.name === 'ToolPen');
t.path = new paper.Path({segments: [a, b], insert: false});
t.point1 = a.clone(); t.mode = 'create'; t.start_binded = true; t.addl_hit = null;
t.on_mouseup({event: null, modifiers: {}});
```

⚠ Концы линии **обязательно на существующих профилях** (рама→рама, рама→импост, импост→импост), иначе получается обрезок. Профили выбирать по `elm_type.name` + `bounds`, иначе привязка уходит.

7. **Створки:**

```js
c.activate();
const leaf = filling.create_leaf($p.cat.furns.get('44624c42-0c4d-11ed-9611-84f1e8809c54')); // GU UNI-JET SCF Пов/откдное
leaf._row.direction = $p.enm.open_directions.Левое;
```

Атомарно в одном вызове, пауза 700 мс между створками — иначе промежуточный `register_change` сносит недособранную створку.

8. **Накладки рамы + импостов:**

```js
c.activate();
await $p.ui.dialogs.region_layer(paper.project);   // создаёт только ряды рамы
// накладки импостов диалог НЕ создаёт (by_default=false) — досоздать вручную:
const row = [...c.children.topLayers.children, ...c.children.bottomLayers.children].find(l => l.kind === 5);
const ins = $p.cat.inserts.by_name('Накладка импоста 124');
const Ed = paper.constructor;
for (const p of [...c.children.profiles.children].filter(z => z.elm_type.name === 'Импост')) {
  const g = new paper.Path({segments: [
    [p.generatrix.firstSegment.point.x, p.generatrix.firstSegment.point.y],
    [p.generatrix.lastSegment.point.x, p.generatrix.lastSegment.point.y]
  ], insert: false});
  new Ed.ProfileRegion({layer: row, parent: row.children.profiles, generatrix: g, proto: {inset: ins}});
}
```

9. **Накладки створок:** для каждого контура из `topLayers` с `cnstr >= 3`: `s.activate(); await $p.ui.dialogs.region_layer(paper.project);`
10. **Сохранение:** `c.activate(); await paper.project.save_coordinates({save: true, close: true})` → возврат в заказ. Надёжнее клика по дискетке.
11. **Марка и количество:**

```js
const d = await $p.doc.calc_order.get(orderRef, 'promise');
const r = [...d.production].pop();
r.note = 'ОК-5'; r.quantity = 510;
await d.recalc(); await d.save();
```

## 3. Проверка (обязательно)

```js
const sp = await ox.specification;      // это DocTabanSection, НЕ массив! sp.filter упадёт
let bad = 0;
sp.forEach(s => { if (/Ошибк/i.test(s.nom.name)) bad++; });
```

Ошибки примыкания = 0 после досоздания накладок импостов.

## 4. Модель (paper.js / metadata.js)

- `project.activeLayer` — контур изделия (kind 0). Дети: `bottomLayers, fillings, profiles, sectionals, topLayers, dimlns, text`.
- Слой ряда = `ContourRegion` с `kind === 5`, `dop {region, grp:'bottom'|'top'}`.
- Створка = отдельный `Contour` в `topLayers`, `cnstr 3`, `level 1`.
- Накладка = `ProfileRegion`, `elm_type.name === 'Ряд'`, `inset.name`: «Накладка рамы 68», «Накладка створки 39», «Накладка импоста 124».
- **Координаты от верха:** `y = 0` — верхний профиль, `y = −H` — нижний. «520 от низа» = `y = −(H − 520)`.
- Габариты мерить **по прямоугольникам заполнений**, не по `path[0].point` (там вспомогательная линия).
- В строке заказа `len` = **ширина**, `width` = **высота** (перепутаны).
- Строки заказа — в `production` (не в `composition`); поле количества — `quantity` (не `qty`).
- Колонки грида: 0 №, 1 номенклатура, 2 характеристика, 3 комментарий, 5 ширина, 6 высота, 7 площадь, 15 сумма дилера.

## 5. Ловушки paper.js

- `Cannot read properties of null (reading '_currentStyle')` — активным слоем стал `ConnectiveLayer`/`ContourVisualization`. Лечится `paper.project.contours[0].activate()`.
- `P.activeLayer = sash` **игнорируется** — использовать `sash.activate()`.
- `p.generatrix.clone({insert:false})` падает на глубоких клонах — строить новый `paper.Path` из двух точек.
- `dimlns` пересоздаётся после каждой правки — массив перечитывать.
- Накладки удалять только по `kind === 5` (иначе сносится сама створка).
- Кнопка «Добавить cлой ряда» срабатывает только при активном слое через `activate()`; при пустом активном слое диалог выходит с «Текущий слой не выбран».
- Ручная сборка слоя ряда (`Contour.create({kind:5})` + `new ProfileRegion`) даёт «полуживой» слой с пустым `_attr` — делать только через диалог `region_layer` + досоздание импостных рядов.

## 6. Порядок удаления (от пользователя)

a) удалить все створки → b) удалить все слои накладок → c) выделить импост мышью и нажать **Delete**.

ВНИМАНИЕ: строки заказа удаляются пользователем вручную (выделить → Delete); программные `production.del()` и кнопка «Удалить строку заказа» не работают.

## 7. Таблица ошибок

| Сообщение | Причина | Решение |
|---|---|---|
| `502 · Вызов необъявленного инструмента` | не подключена группа инструментов агента | `load_tools`, повторить |
| «некорректный вызов инструмента» | слишком длинный JS | дробить на короткие вызовы |
| «Перед добавлением створки укажите заполнение» | не выделено заполнение | выделять мышью на эскизе |
| «Ошибка примыкающего соединения» | нет накладок рамы/створки/импоста | пересоздать накладки, импостам — вручную |
| эскиз трапецией | правились координаты концов, а не длины | `paper._undo.back()`, менять размеры через `sizes_wnd` |
| «объект изменён другим процессом» | параллельная запись заказа и изделия | перечитать `d.load()`, повторить; проверять `_rev` |
| «покинуть страницу без сохранения» | переход без дискетки | сначала сохранять |

## 8. ТЗ — соответствие

**СПД 50 = створка, СПД 48 = глухарь.** Створки везде левые.

- Створка: СПД 50мм (6EnLtCl)-18Al-(4M1)-18AL-(4M1) → в справочнике `b9fa3800-854e-11ed-9611-84f1e8809c54`
- Глухарь: СПД 48мм (6VLt)-18AL-(4М1)-16AL-(4М1) (в справочнике есть точь-в-точь)

Состав заказа №ЕСБМИ000005 (итог): 19 строк, 1103 шт, 4523,79 м², ≈83,5 млн ₽, ошибок примыкания 0.

## 9. Ссылки

- https://github.com/oknosoft/windowbuilder
- https://github.com/oknosoft/windowbuilder-core
- https://github.com/oknosoft/metadata.js
- Исходник построителя в сборке: `/dist/windowbuilder.js`

---

**Как сохранить:** в папке `oknosoft-windowbuilder-skill` создайте файл `SKILL.md` (Блокнот → Сохранить как → тип «Все файлы» → имя `SKILL.md` → кодировка UTF-8) и вставьте из буфера.

Одно предупреждение: в тексте есть реальный `ref` заказа в примерах адресов? — нет, я оставил заглушки `<ref>`, так что файл безопасно публиковать. GUID'ы фурнитуры и вставок — это справочники системы, они одинаковы у всех, их публиковать нормально.

Скажите, если нужно: **собрать в буфер `README.md`**, **`examples.md`** или **заново два длинных файла** (`okno-bridge.js`, `server.mjs`) — их я тоже могу положить в буфер по одному.