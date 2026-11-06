#!/usr/bin/env node
/**
 * server.mjs — MCP-сервер для автоматизации построителя ОкноСофт (windowbuilder)
 * через Chrome DevTools Protocol. Требует: Chrome запущен с
 *   --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1
 * и открыта вкладка ОкноСофта.
 *
 * Зависимости: chrome-remote-interface, @modelcontextprotocol/sdk, zod
 */
import CDP from 'chrome-remote-interface';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE  = path.dirname(fileURLToPath(import.meta.url));
const PORT  = Number(process.env.CDP_PORT || 9222);
const MATCH = process.env.OKNO_URL_MATCH || 'oknosoft';

let client = null;

async function attach() {
  if (client) return client;
  const targets = await CDP.List({ port: PORT });
  const t = targets.find(x => x.type === 'page' && x.url.includes(MATCH));
  if (!t) {
    throw new Error(
      `вкладка с «${MATCH}» не найдена. Запустите Chrome с --remote-debugging-port=${PORT} ` +
      `и откройте ОкноСофт (сейчас вкладок: ${targets.filter(x => x.type === 'page').length})`
    );
  }
  client = await CDP({ target: t, port: PORT });
  await client.Runtime.enable();
  await client.Page.enable();
  client.on('disconnect', () => { client = null; });
  return client;
}

async function evaluate(expression) {
  const c = await attach();
  const { result, exceptionDetails } = await c.Runtime.evaluate({
    expression, awaitPromise: true, returnByValue: true, userGesture: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  }
  return result.value;
}

let bridgeSrc = null;
async function ensureBridge() {
  if (!bridgeSrc) bridgeSrc = await readFile(path.join(HERE, 'okno-bridge.js'), 'utf8');
  const state = await evaluate('typeof window.okno === "object" && window.okno.v || 0');
  if (state >= 2) return 'already';
  return evaluate(bridgeSrc);
}

const json = v => ({ content: [{ type: 'text', text: JSON.stringify(v, null, 2) }] });

const server = new McpServer({ name: 'oknosoft', version: '1.1.0' });

server.tool('okno_attach',
  'Подключиться к вкладке ОкноСофт и вставить мост okno-bridge.js',
  {}, async () => json({ bridge: await ensureBridge(), status: await evaluate('window.okno.status()') }));

server.tool('okno_status',
  'Состояние построителя: открыт ли редактор, размеры на чертеже, число строк заказа',
  {}, async () => { await ensureBridge(); return json(await evaluate('window.okno.status()')); });

server.tool('okno_dims',
  'Размерные надписи на чертеже с координатами для клика',
  {}, async () => { await ensureBridge(); return json(await evaluate('window.okno.dims()')); });

server.tool('okno_set_size',
  'Задать габариты изделия (ширина/высота, мм) в открытом построителе',
  { width: z.number().optional(), height: z.number().optional() },
  async ({ width, height }) => {
    await ensureBridge();
    return json(await evaluate(`window.okno.setSize(${width ?? null}, ${height ?? null})`));
  });

server.tool('okno_fit', 'Вписать чертёж в окно (полезно перед кликами по размерам)',
  {}, async () => { await ensureBridge(); return json(await evaluate('window.okno.fitView()')); });

server.tool('okno_save', 'Нажать «Рассчитать, записать и закрыть»',
  {}, async () => { await ensureBridge(); return json(await evaluate('window.okno.save()')); });

server.tool('okno_rows', 'Строки заказа из таблицы «Продукция»',
  {}, async () => { await ensureBridge(); return json(await evaluate('window.okno.rows()')); });

server.tool('okno_del_row', 'Удалить строку заказа по id (выделение + Delete в грид)',
  { rowId: z.string() },
  async ({ rowId }) => {
    await ensureBridge();
    return json(await evaluate(`window.okno.delRow(${JSON.stringify(rowId)})`));
  });

server.tool('okno_click_title', 'Нажать кнопку панели по её title',
  { title: z.string() },
  async ({ title }) => {
    await ensureBridge();
    return json(await evaluate(`window.okno.clickTitle(${JSON.stringify(title)})`));
  });

server.tool('okno_click_row', 'Выделить строку заказа по индексу (0 — первая)',
  { index: z.number() },
  async ({ index }) => {
    await ensureBridge();
    return json(await evaluate(`window.okno.clickRow(${index})`));
  });

server.tool('okno_eval', 'Выполнить произвольное короткое выражение в контексте страницы (аварийный выход)',
  { expression: z.string() },
  async ({ expression }) => json(await evaluate(expression)));

await server.connect(new StdioServerTransport());