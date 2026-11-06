\# oknosoft-windowbuilder-skill



Скилл и инструменты для автоматизации построителя окон \*\*ОкноСофт / windowbuilder\*\*

(\[metadata.js](https://github.com/oknosoft/metadata.js) +

\[windowbuilder-core](https://github.com/oknosoft/windowbuilder-core)) через Chrome DevTools Protocol.



Позволяет агенту или скрипту собирать изделия в построителе без ручных кликов:

задавать габариты, ставить импосты, создавать створки с фурнитурой, строить накладки,

пересчитывать и записывать изделие в заказ.



Скилл проверен на реальном заказе: \*\*19 изделий, 1103 шт, 4523,79 м², 0 ошибок примыкания.\*\*



\## Состав репозитория



| Файл | Назначение |

|---|---|

| `SKILL.md` | основной скилл: правила, рецепты, ловушки, таблица ошибок |

| `okno-bridge.js` | мост, который вставляется в страницу ОкноСофта (API `window.okno`) |

| `server.mjs` | MCP-сервер: CDP → страница, набор инструментов `okno\_\*` |

| `examples.md` | готовые однострочные вызовы `evaluate\_js` |

| `package.json` | зависимости для `server.mjs` |



\## Быстрый старт (MCP + CDP)



1\. Node.js 18+

&nbsp;  ```bash

&nbsp;  node --version

&nbsp;  ```



2\. Установить зависимости

&nbsp;  ```bash

&nbsp;  npm install

&nbsp;  ```



3\. Закрыть Chrome и запустить с отладочным портом

&nbsp;  ```bash

&nbsp;  # Windows

&nbsp;  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1



&nbsp;  # macOS

&nbsp;  open -a "Google Chrome" --args --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1



&nbsp;  # Linux

&nbsp;  google-chrome --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1

&nbsp;  ```



4\. Открыть ОкноСофт, зайти в заказ, открыть построитель изделия.



5\. Подключить MCP-сервер в настройках клиента

&nbsp;  ```json

&nbsp;  {

&nbsp;    "mcpServers": {

&nbsp;      "oknosoft": {

&nbsp;        "command": "node",

&nbsp;        "args": \["/полный/путь/до/server.mjs"]

&nbsp;      }

&nbsp;    }

&nbsp;  }

&nbsp;  ```



6\. Проверить связь — вызвать инструмент `okno\_status`.



\## Быстрый старт (без Node, только консоль)



1\. Открыть ОкноСофт и построитель.

2\. \*\*F12\*\* → вкладка \*\*Console\*\*.

3\. Вставить содержимое `okno-bridge.js` → Enter. Ответ: `okno v2`.

4\. Командовать вручную:

&nbsp;  ```js

&nbsp;  okno.setSize(1350, 2200)

&nbsp;  okno.status()

&nbsp;  ```



Мост не переживает перезагрузку страницы — после обновления вставлять заново.



\## Инструменты MCP



| Инструмент | Что делает |

|---|---|

| `okno\_attach` | подключиться к вкладке и вставить мост |

| `okno\_status` | состояние: открыт ли редактор, габариты, строки, модалки |

| `okno\_dims` | размерные надписи на эскизе + координаты клика |

| `okno\_set\_size` | задать ширину/высоту |

| `okno\_fit` | вписать чертёж в окно |

| `okno\_save` | «Рассчитать, записать и закрыть» |

| `okno\_rows` | строки заказа из грида |

| `okno\_del\_row` | удалить строку заказа (выделить + Delete) |

| `okno\_click\_title` | нажать кнопку панели по `title` |

| `okno\_click\_row` | выделить строку заказа по индексу |

| `okno\_eval` | выполнить произвольное короткое выражение |



\## Безопасность



CDP-порт даёт \*\*полный доступ к браузеру\*\*. Поэтому:



\- слушайте только localhost: `--remote-debugging-address=127.0.0.1`;

\- не держите порт открытым постоянно;

\- используйте отдельный профиль Chrome;

\- не запускайте с этим флагом браузер, где открыты банки и почта.



\## Ограничения и известные проблемы



\- `doc.composition` в metadata.js отдаёт 0 строк при заполненном гриде — читать `production` или грид.

\- Накладки импостов не создаются диалогом `region\_layer` (`by\_default = false`) — досоздаются вручную.

\- «объект изменён другим процессом» — часто ложная тревога, проверять `\_rev` в CouchDB.

\- Строки заказа удаляются только вручную (выделить → Delete).



Подробности — в `SKILL.md`, разделы 5 и 7.



\## Лицензия



MIT — см. `LICENSE`.

