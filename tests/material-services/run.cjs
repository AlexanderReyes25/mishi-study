const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

const project = require('node:path').resolve(__dirname, '../..');
const sourceHashes = {};
const results = [];
let assertions = 0;
function equal(actual, expected, message) {
  assertions++;
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);
}
function ok(value, message) { assertions++; assert.ok(value, message); }
async function rejects(promise, pattern) {
  assertions++;
  await assert.rejects(promise, pattern);
}
function load(relative, imports) {
  const source = fs.readFileSync(path.join(project, relative), 'utf8');
  sourceHashes[relative] = crypto.createHash('sha256').update(source).digest('hex');
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const box = { exports: {} };
  vm.runInNewContext(output, {
    exports: box.exports,
    require(name) {
      if (!(name in imports)) throw new Error(`Unmocked import: ${name}`);
      return imports[name];
    },
    Date, Error, Set, JSON,
  }, { filename: relative });
  return box.exports;
}
const contract = load('supabase/functions/_shared/lesson.ts', {});

function card(id = 'card-1', overrides = {}) {
  return {
    id, user_id: 'user-1', material_id: 'material-1',
    front: '¿Cuánto es $2+2$?', back: '$4$', difficulty: 2,
    interval_days: 0, next_review_at: '2020-01-01T00:00:00.000Z',
    times_correct: 0, times_wrong: 0, created_at: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}
function lesson(overrides = {}) {
  return {
    id: 'lesson-1', user_id: 'user-1', material_id: 'material-1', topic: 'Álgebra',
    title: ' Ecuaciones ', content: 'Resuelve $2x=8$.',
    blocks: [{ type: 'text', content: ' Resuelve la ecuación. ' }, { type: 'formula', latex: '2x=8' }],
    created_at: '2026-10-20T10:00:00.000Z', ...overrides,
  };
}
function setup({ lessons = [], cards = [], faults = [], ai } = {}) {
  const state = { tables: { lessons: structuredClone(lessons), flashcards: structuredClone(cards) }, queries: [], aiCalls: [], faults: [...faults] };
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.operation = 'select'; }
    select(columns, options = {}) { this.columns = columns; this.options = options; return this; }
    eq(column, value) { this.filters.push(['eq', column, value]); return this; }
    lte(column, value) { this.filters.push(['lte', column, value]); return this; }
    order(column, options) { this.ordering = [column, options.ascending]; return this; }
    limit(limit) { this.maximum = limit; return this; }
    update(values) { this.operation = 'update'; this.values = values; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybeSingle'; return this; }
    then(resolve, reject) {
      try { return Promise.resolve(this.execute()).then(resolve, reject); }
      catch (error) { return Promise.reject(error).then(resolve, reject); }
    }
    execute() {
      state.queries.push({
        table: this.table, operation: this.operation, columns: this.columns,
        filters: this.filters, options: this.options, mode: this.mode,
        values: this.values, maximum: this.maximum, ordering: this.ordering,
      });
      const faultIndex = state.faults.findIndex((fault) =>
        (!fault.table || fault.table === this.table) &&
        (!fault.operation || fault.operation === this.operation) &&
        (!fault.at || fault.at === state.queries.length));
      if (faultIndex >= 0) return state.faults.splice(faultIndex, 1)[0].response;
      let rows = state.tables[this.table].filter((row) => this.filters.every(([op, key, value]) =>
        op === 'eq' ? row[key] === value : row[key] <= value));
      if (this.operation === 'update') rows.forEach((row) => Object.assign(row, this.values));
      if (this.ordering) {
        const [key, ascending] = this.ordering;
        rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (ascending ? 1 : -1));
      }
      const count = rows.length;
      if (this.maximum != null) rows = rows.slice(0, this.maximum);
      if (this.mode === 'single' && rows.length !== 1) {
        return { data: null, count, error: { code: 'PGRST116', message: 'Expected exactly one row' } };
      }
      return { data: this.options?.head ? null : structuredClone(this.mode ? rows[0] ?? null : rows), count, error: null };
    }
  }
  const supabase = { from: (table) => new Query(table) };
  const runAi = async (...args) => {
    state.aiCalls.push(args);
    if (ai) return ai(state, ...args);
    state.tables.flashcards.push(card('generated-1', { material_id: args[1] }));
    return { flashcards: [{ id: 'generated-1' }] };
  };
  const integration = load('src/services/estudioIntegracion.ts', {
    '../../supabase/functions/_shared/lesson': contract, './supabase': { supabase }, './ai': { runAi },
  });
  const study = load('src/services/study.ts', { './supabase': { supabase } });
  return { state, ...integration, ...study };
}
async function test(name, fn) {
  const start = assertions;
  await fn();
  results.push({ name, assertions: assertions - start, passed: true });
}

(async () => {
  await test('Carga bloques reales del tema y material del usuario, elige la versión más reciente', async () => {
    const h = setup({ lessons: [
      lesson({ id: 'old', created_at: '2026-10-19T00:00:00Z' }),
      lesson({ id: 'other-user', user_id: 'user-2' }),
      lesson({ id: 'other-material', material_id: 'material-2' }),
      lesson({ id: 'other-topic', topic: 'Biología' }),
      lesson({ id: 'new' }),
    ] });
    const saved = await h.cargarLeccion('user-1', 'material-1', 'Álgebra');
    equal(saved.id, 'new');
    equal(saved.title, 'Ecuaciones');
    equal(saved.blocks, [{ type: 'text', content: 'Resuelve la ecuación.' }, { type: 'formula', latex: '2x=8' }]);
    equal(h.state.queries[0].filters, [['eq', 'user_id', 'user-1'], ['eq', 'material_id', 'material-1'], ['eq', 'topic', 'Álgebra']]);
    equal(h.state.queries[0].maximum, 1);
    equal(h.state.aiCalls.length, 0);
  });
  await test('Lección antigua usa Markdown y tema como título cuando faltan bloques y título', async () => {
    const h = setup({ lessons: [lesson({ title: null, blocks: null, content: 'Texto **guardado**' })] });
    const saved = await h.cargarLeccion('user-1', 'material-1', 'Álgebra');
    equal(saved.title, 'Álgebra');
    equal(saved.blocks, null);
    equal(saved.content, 'Texto **guardado**');
  });
  await test('Lección inexistente produce error útil', async () => {
    await rejects(setup().cargarLeccion('user-1', 'material-1', 'Álgebra'), /no está guardada/);
  });
  await test('Error al leer la lección no se oculta', async () => {
    const h = setup({ faults: [{ table: 'lessons', response: { data: null, error: { message: 'DB unavailable' } } }] });
    await rejects(h.cargarLeccion('user-1', 'material-1', 'Álgebra'), /DB unavailable/);
  });
  await test('Bloques inválidos y Markdown vacío se rechazan', async () => {
    await rejects(setup({ lessons: [lesson({ blocks: [] })] }).cargarLeccion('user-1', 'material-1', 'Álgebra'), /entre 1 y 40/);
    await rejects(setup({ lessons: [lesson({ blocks: null, content: '   ' })] }).cargarLeccion('user-1', 'material-1', 'Álgebra'), /no tiene contenido/);
  });
  await test('Listado filtra usuario, ordena y limita a treinta lecciones', async () => {
    const records = Array.from({ length: 35 }, (_, i) => lesson({ id: `lesson-${i}`, topic: `Topic ${i}`, created_at: String(i).padStart(3, '0') }));
    records.push(lesson({ id: 'private-other-user', user_id: 'user-2', created_at: '999' }));
    const h = setup({ lessons: records });
    const rows = await h.listarLecciones('user-1');
    equal(rows.length, 30);
    equal(rows[0].id, 'lesson-34');
    ok(rows.every((row) => row.user_id === 'user-1'));
    equal(h.state.queries[0].filters, [['eq', 'user_id', 'user-1']]);
  });
  await test('Listado deduplica material y tema conservando la explicación más reciente', async () => {
    const h = setup({ lessons: [
      lesson({ id: 'old', created_at: '2026-10-19T00:00:00Z' }),
      lesson({ id: 'new' }),
      lesson({ id: 'same-topic-other-material', material_id: 'material-2' }),
      lesson({ id: 'same-material-other-topic', topic: 'Biología' }),
    ] });
    const rows = await h.listarLecciones('user-1');
    equal(rows.length, 3);
    ok(rows.some((row) => row.id === 'new'));
    ok(!rows.some((row) => row.id === 'old'));
    ok(rows.some((row) => row.id === 'same-topic-other-material'));
    ok(rows.some((row) => row.id === 'same-material-other-topic'));
  });
  await test('Listado vacío es válido y error de listado se propaga', async () => {
    equal(await setup().listarLecciones('user-1'), []);
    const h = setup({ faults: [{ table: 'lessons', response: { data: null, error: { message: 'list error' } } }] });
    await rejects(h.listarLecciones('user-1'), /list error/);
  });
  await test('Tarjetas existentes vencidas se reutilizan sin IA', async () => {
    const h = setup({ cards: [card()] });
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls.length, 0);
    equal(h.state.queries.length, 1);
  });
  await test('Tarjetas futuras también se reutilizan; no se generan duplicados', async () => {
    const h = setup({ cards: [card('future', { next_review_at: '2099-01-01T00:00:00Z' })] });
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls.length, 0);
    ok(h.state.queries[0].filters.every(([op]) => op === 'eq'));
  });
  await test('Tarjetas de otro usuario/material no impiden crear las del material solicitado', async () => {
    const h = setup({ cards: [card('private', { user_id: 'user-2' }), card('different', { material_id: 'material-2' })] });
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls, [['flashcards', 'material-1', { count: 8 }]]);
    equal(h.state.queries.length, 2);
    ok(h.state.queries.every((q) => JSON.stringify(q.filters) === JSON.stringify([['eq', 'user_id', 'user-1'], ['eq', 'material_id', 'material-1']])));
    equal(h.state.tables.flashcards.length, 3);
  });
  await test('Error o conteo desconocido antes de generar bloquea la llamada IA', async () => {
    const error = setup({ faults: [{ table: 'flashcards', response: { count: null, error: { message: 'count error' } } }] });
    await rejects(error.prepararTarjetas('user-1', 'material-1'), /count error/);
    equal(error.state.aiCalls.length, 0);
    const unknown = setup({ faults: [{ table: 'flashcards', response: { count: null, error: null } }] });
    await rejects(unknown.prepararTarjetas('user-1', 'material-1'), /No se pudo comprobar/);
    equal(unknown.state.aiCalls.length, 0);
  });
  await test('Generación nueva confirma persistencia con segunda consulta', async () => {
    const h = setup();
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls.length, 1);
    equal(h.state.queries.length, 2);
    equal(h.state.tables.flashcards.length, 1);
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls.length, 1);
  });
  await test('Respuesta IA exitosa sin tarjetas persistidas falla', async () => {
    const h = setup({ ai: async () => ({ flashcards: [{ id: 'unpersisted' }] }) });
    await rejects(h.prepararTarjetas('user-1', 'material-1'), /La IA no guardó tarjetas/);
    equal(h.state.queries.length, 2);
  });
  await test('Respuesta perdida tras guardar se recupera por consulta sin repetir IA', async () => {
    const h = setup({ ai: async (state) => {
      state.tables.flashcards.push(card());
      throw new Error('Network response lost');
    } });
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls.length, 1);
    equal(h.state.queries.length, 2);
    await h.prepararTarjetas('user-1', 'material-1');
    equal(h.state.aiCalls.length, 1);
  });
  await test('Error IA sin escritura conserva el error original', async () => {
    const h = setup({ ai: async () => { throw new Error('AI failed'); } });
    await rejects(h.prepararTarjetas('user-1', 'material-1'), /AI failed/);
    equal(h.state.queries.length, 2);
  });
  await test('Error de consulta al confirmar guardado no se anuncia como éxito', async () => {
    const h = setup({ faults: [{ table: 'flashcards', at: 2, response: { count: null, error: { message: 'confirmation failed' } } }] });
    await rejects(h.prepararTarjetas('user-1', 'material-1'), /confirmation failed/);
    equal(h.state.aiCalls.length, 1);
  });
  await test('Repaso confirma fila devuelta y programa intervalos 1, 2, 0 con contadores', async () => {
    const h = setup({ cards: [card()] });
    const first = await h.reviewFlashcard(card(), true);
    const second = await h.reviewFlashcard(first, true);
    const wrong = await h.reviewFlashcard(second, false);
    equal([first.interval_days, second.interval_days, wrong.interval_days], [1, 2, 0]);
    equal([wrong.times_correct, wrong.times_wrong], [2, 1]);
    equal(h.state.tables.flashcards[0], wrong);
    ok(h.state.queries.every((q) => q.operation === 'update' && q.mode === 'single' && q.columns === '*'));
    ok(Math.abs(new Date(first.next_review_at).getTime() - Date.now() - 86400000) < 2000);
    ok(Math.abs(new Date(wrong.next_review_at).getTime() - Date.now()) < 2000);
  });
  await test('Repaso rechaza UPDATE con cero filas en vez de fingir guardado', async () => {
    const h = setup();
    await rejects(h.reviewFlashcard(card(), true), /No se pudo guardar tu respuesta/);
    equal(h.state.queries[0].mode, 'single');
  });
  await test('Repaso rechaza fila ausente o ID distinto incluso sin error explícito', async () => {
    const absent = setup({ faults: [{ table: 'flashcards', response: { data: null, error: null } }] });
    await rejects(absent.reviewFlashcard(card(), true), /No se confirmó/);
    const wrong = setup({ faults: [{ table: 'flashcards', response: { data: card('other'), error: null } }] });
    await rejects(wrong.reviewFlashcard(card(), true), /No se confirmó/);
  });
  await test('Repaso conserva datos devueltos por el servidor', async () => {
    const confirmed = card('card-1', { interval_days: 7, times_correct: 20 });
    const h = setup({ faults: [{ table: 'flashcards', response: { data: confirmed, error: null } }] });
    equal(await h.reviewFlashcard(card(), true), confirmed);
  });
  await test('Cola de repaso por material excluye futuras y limita el lote', async () => {
    const h = setup({ cards: [card('due-a'), card('due-b'), card('other', { material_id: 'material-2' }), card('future', { next_review_at: '2099-01-01T00:00:00Z' })] });
    const due = await h.getDueFlashcards('material-1', 1);
    equal(due.length, 1);
    equal(due[0].id, 'due-a');
    ok(h.state.queries[0].filters.some(([op, key, value]) => op === 'eq' && key === 'material_id' && value === 'material-1'));
    equal(await h.getDueCount(), 3);
  });
  const report = { project, timestamp: new Date().toISOString(), scenarios: results.length, assertions, passed: results.every((r) => r.passed), sourceHashes, results };
  fs.writeFileSync(path.join(__dirname, 'services-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ scenarios: results.length, assertions, passed: report.passed, report: path.join(__dirname, 'services-report.json') }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
