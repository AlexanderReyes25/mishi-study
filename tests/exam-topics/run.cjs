const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function load(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, console, ...globals, require(name) {
    if (!(name in mocks)) throw Error(`Unexpected import: ${name}`);
    return mocks[name];
  } });
  return module.exports;
}
const contract = load('supabase/functions/_shared/exam.ts');
const plain = v => JSON.parse(JSON.stringify(v));
const question = (i = 1, overrides = {}) => ({ type: 'multiple_choice', question: `Pregunta ${i}`, options: ['A', 'B'], correct_answer: 'A', explanation: 'Según el material.', topic: 'Álgebra', ...overrides });
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('OK ' + name); }

// Ejecuta el manejador real de ai-study con transporte y persistencia simulados.
function edge(options = {}) {
  let handler;
  const calls = [], prompts = [];
  const material = { id: 'm1', title: 'Apuntes de dos materias', raw_text: 'Contenido del tema.', topics: ['Álgebra', 'Historia'], ...options.material };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: options.unauthorized ? null : { id: 'u1' } } }) },
    storage: { from: () => ({ download: async () => ({ data: new Blob(['PDF simulado']), error: null }) }) },
    from(table) {
      let op = 'select', values, columns, filters = [];
      const query = {
        select(v) { columns = v; return query; }, eq(k, v) { filters.push([k, v]); return query; },
        single() { return query; }, insert(v) { op = 'insert'; values = v; return query; },
        update(v) { op = 'update'; values = v; return query; }, delete() { op = 'delete'; return query; },
        then(resolve, reject) { return Promise.resolve().then(() => {
          calls.push({ table, op, values: plain(values ?? null), columns, filters: plain(filters) });
          if (table === 'materials') return { data: options.missing ? null : material };
          if (table === 'profiles') return { data: { level: 2 } };
          if (table === 'exams') return { data: { id: 'e1', title: 'Examen', kind: 'diagnostic' } };
          if (table === 'exam_questions') {
            if (options.saveError) return { error: { message: 'DB failed' } };
            return { data: values.map((q, i) => ({ id: `q${i}`, type: q.type, question: q.question, options: q.options, topic: q.topic, position: q.position })) };
          }
          throw Error('Unexpected table: ' + table);
        }).then(resolve, reject); },
      };
      return query;
    },
  };
  load('supabase/functions/ai-study/index.ts', {
    'jsr:@std/encoding@1/base64': { encodeBase64: v => Buffer.from(v).toString('base64') },
    'npm:@supabase/supabase-js@2': { createClient: () => supabase },
    '../_shared/lesson.ts': {}, '../_shared/exam.ts': contract,
  }, {
    Deno: { env: { get: () => 'test-only' }, serve: fn => { handler = fn; } },
    console: { log() {}, error() {} }, Request, Response, AbortController, setTimeout, clearTimeout,
    fetch: async (_url, init) => {
      prompts.push(JSON.parse(init.body));
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Examen', questions: options.questions ?? [question()] }) }] } }] });
    },
  });
  return { calls, prompts, async run(body = {}, auth = true) {
    const response = await handler(new Request('https://example.test/ai-study', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer test' } : {}) },
      body: JSON.stringify({ action: 'exam', materialId: 'm1', count: 'auto', topics: ['Álgebra'], ...body }),
    }));
    return { status: response.status, body: await response.json() };
  } };
}

const tick = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function picker(options = {}) {
  const hooks = [], cleanups = [], effects = [], calls = { reads: 0, detects: 0, late: 0 };
  let cursor = 0, mounted = true;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], v => { if (!mounted) calls.late++; hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((d, n) => d !== hooks[i][n])) { hooks[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const Component = load('src/features/examenes/components/ExamTopicSelection.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { Text: 'Text' },
    '../../../../supabase/functions/_shared/exam': contract,
    '../../../components/MishiUI': { Page: 'Page', SectionHeading: 'SectionHeading', ui: {} },
    '../../../components/Card': { Card: 'Card' }, '../../../components/Button': { Button: 'Button' },
    '../../../services/exams': {
      getExamTopics: async () => { calls.reads++; if (options.readError) throw Error('Sin conexión'); return options.topics ?? ['Álgebra', 'Historia']; },
      detectExamTopics: async () => { calls.detects++; if (options.detectError) throw Error('IA no disponible'); return options.pending ?? ['Álgebra', 'Historia']; },
    },
    '../../../services/progress': { MIN_QUESTIONS_PER_TOPIC: 3, PASS_MARK: 60 },
    '../navigation': { goBackOr() {} }, './ExamIntro': { ExamIntro: 'ExamIntro' },
    './StatusCards': { ErrorCard: 'ErrorCard', LoadingCard: 'LoadingCard' },
  }).ExamTopicSelection;
  function render() { cursor = 0; const tree = Component({ materialId: 'm1', title: 'Mis apuntes' }); effects.splice(0).forEach(fn => fn()); return tree; }
  function walk(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(walk); return [node, ...walk(node.props?.children)]; }
  function nodes() { return walk(render()); }
  return { calls, render, nodes, press(label) { const button = nodes().find(n => n.type === 'Button' && n.props.label === label); assert(button, label); assert(!button.props.disabled); button.props.onPress(); }, unmount() { mounted = false; cleanups.forEach(fn => fn?.()); } };
}

(async () => {
  await test('Una sola pregunta válida se conserva; no se rellena hasta ocho', () => {
    assert.equal(contract.parseExamQuestions([question()], ['Álgebra'], 15).length, 1);
  });
  await test('El máximo de auto es 15 y el límite numérico admite 1', () => {
    assert.equal(contract.examQuestionLimit('auto'), 15);
    assert.equal(contract.examQuestionLimit(1), 1);
    assert.equal(contract.examQuestionLimit(999), 15);
  });
  await test('Descarta vacías, abiertas, ambiguas, opciones repetidas y respuestas inexistentes', () => {
    const invalid = [null, {}, question(1, { question: ' ' }), question(2, { type: 'open' }), question(3, { options: ['A', ' A '] }), question(4, { correct_answer: 'C' }), question(5, { explanation: '' }), question(6, { options: ['A', 2] }), question(7, { type: 'true_false' })];
    assert.equal(contract.parseExamQuestions(invalid, ['Álgebra'], 15).length, 0);
  });
  await test('Admite verdadero/falso válido y preserva LaTeX y mayúsculas matemáticas', () => {
    const rows = contract.parseExamQuestions([question(1, { type: 'true_false', options: ['Verdadero', 'Falso'], correct_answer: 'Falso' }), question(2, { question: 'Calcula $\\frac{7}{8}$', options: ['$A$', '$a$'], correct_answer: '$a$' })], ['Álgebra'], 15);
    assert.equal(rows.length, 2); assert.equal(rows[1].correct_answer, '$a$'); assert.match(rows[1].question, /\\frac/);
  });
  await test('Elimina repeticiones del mismo enunciado y no cambia etiquetas de otro tema', () => {
    assert.equal(contract.parseExamQuestions([question(), question(2, { question: '  Pregunta   1 ' }), question(3, { topic: 'Historia' })], ['Álgebra'], 15).length, 1);
  });
  await test('El prompt exige contenido del tema, sin mínimo ni relleno', () => {
    const prompt = contract.examTask(15, ['Álgebra'], ['Álgebra', 'Historia']);
    assert.match(prompt, /NO existe un mínimo/); assert.match(prompt, /Ignora el resto/); assert.match(prompt, /NO una meta/); assert(!prompt.includes('Historia'));
  });
  await test('Edge acepta 1 pregunta, devuelve cantidad auto y oculta soluciones', async () => {
    const e = edge(); const r = await e.run(); assert.equal(r.status, 200); assert.equal(r.body.questions.length, 1); assert.equal(r.body.countMode, 'auto'); assert(!('correct_answer' in r.body.questions[0]));
    assert.deepEqual(e.calls.find(c => c.table === 'exams' && c.op === 'insert').values.focus_topics, ['Álgebra']);
  });
  await test('Edge recorta una respuesta excesiva a 15 preguntas', async () => {
    const e = edge({ questions: Array.from({ length: 25 }, (_, i) => question(i)) }); const r = await e.run(); assert.equal(r.body.questions.length, 15);
    assert.equal(e.calls.find(c => c.table === 'exam_questions').values.length, 15);
  });
  await test('Edge admite dos preguntas, sin forzar tres ni ocho', async () => {
    assert.equal((await edge({ questions: [question(1), question(2)] }).run()).body.questions.length, 2);
  });
  await test('Edge rechaza selección ausente, múltiple o ajena antes de llamar a Gemini', async () => {
    for (const topics of [[], ['Álgebra', 'Historia'], ['Biología']]) { const e = edge(); assert.equal((await e.run({ topics })).status, 400); assert.equal(e.prompts.length, 0); assert(!e.calls.some(c => c.table === 'exams')); }
  });
  await test('Edge no crea exámenes vacíos con material insuficiente o respuestas inválidas', async () => {
    for (const questions of [[], [question(1, { correct_answer: 'C' })], [question(1, { topic: 'Historia' })]]) { const e = edge({ questions }); assert.equal((await e.run()).status, 422); assert(!e.calls.some(c => c.table === 'exams')); }
  });
  await test('Edge conserva solo preguntas del tema seleccionado, sin renombrar otras', async () => {
    const r = await edge({ questions: [question(1, { topic: 'Historia' }), question(2)] }).run(); assert.equal(r.body.questions.length, 1); assert.equal(r.body.questions[0].question, 'Pregunta 2');
  });
  await test('Edge sigue exigiendo sesión y acceso al material', async () => {
    const missingAuth = edge(); assert.equal((await missingAuth.run({}, false)).status, 401); assert.equal(missingAuth.prompts.length, 0);
    assert.equal((await edge({ unauthorized: true }).run()).status, 401);
    const missing = edge({ missing: true }); assert.equal((await missing.run()).status, 404); assert.equal(missing.prompts.length, 0);
  });
  await test('Edge admite solicitudes numéricas antiguas y limita sus resultados', async () => {
    const r = await edge({ questions: [question(1), question(2)] }).run({ count: 1, topics: [] }); assert.equal(r.status, 200); assert.equal(r.body.questions.length, 1); assert.equal(r.body.countMode, 'limit');
  });
  await test('Edge elimina el examen vacío si falla la escritura de preguntas', async () => {
    const e = edge({ saveError: true }); assert.equal((await e.run()).status, 500); assert.deepEqual(e.calls.find(c => c.table === 'exams' && c.op === 'delete').filters, [['id', 'e1'], ['user_id', 'u1']]);
  });
  await test('Edge envía PDF o foto completos con el filtro de tema; no texto vacío', async () => {
    for (const file_type of ['pdf', 'image']) { const e = edge({ material: { file_path: 'u1/apuntes.' + (file_type === 'pdf' ? 'pdf' : 'jpg'), file_type, raw_text: null } }); assert.equal((await e.run()).status, 200); const parts = e.prompts[0].contents[0].parts; assert.match(parts[0].text, /SOLO los temas seleccionados/); assert.equal(parts[1].inlineData.mimeType, file_type === 'pdf' ? 'application/pdf' : 'image/jpeg'); }
  });
  await test('La lista ofrece ocho temas y no genera exámenes al abrirla', async () => {
    const topics = Array.from({ length: 8 }, (_, i) => `Tema ${i + 1}`), h = picker({ topics }); h.render(); await tick(); assert.equal(h.calls.detects, 0); for (const topic of topics) assert(h.nodes().some(n => n.props?.label === topic));
    h.press('Tema 5'); const intro = h.render(); assert.equal(intro.type, 'ExamIntro'); assert.deepEqual(plain(intro.props.topics), ['Tema 5']); assert.equal(intro.props.count, 'auto');
    intro.props.onChangeTopic(); h.press('Tema 2'); assert.deepEqual(plain(h.render().props.topics), ['Tema 2']);
  });
  await test('Sin temas, la IA solo se llama al tocar Detectar; doble toque compartido', async () => {
    let resolve; const pending = new Promise(r => { resolve = r; }); const h = picker({ topics: [], pending }); h.render(); await tick(); assert.equal(h.calls.detects, 0);
    const button = h.nodes().find(n => n.props?.label === 'Detectar temas'); button.props.onPress(); button.props.onPress(); assert.equal(h.calls.detects, 1); resolve(['Álgebra']); await tick(); h.press('Álgebra'); assert.equal(h.render().type, 'ExamIntro');
  });
  await test('Fallos de lectura y detección permiten reintentar la operación correcta', async () => {
    const options = { readError: true, topics: [], detectError: true }, h = picker(options); h.render(); await tick(); let error = h.nodes().find(n => n.type === 'ErrorCard'); assert(error); options.readError = false; error.props.onRetry(); h.render(); await tick(); assert.equal(h.calls.reads, 2); h.press('Detectar temas'); await tick(); error = h.nodes().find(n => n.type === 'ErrorCard'); assert(error); options.detectError = false; error.props.onRetry(); await tick(); assert.equal(h.calls.detects, 2); h.press('Historia');
  });
  await test('Salir durante detección no actualiza una pantalla desmontada', async () => {
    let resolve; const h = picker({ topics: [], pending: new Promise(r => { resolve = r; }) }); h.render(); await tick(); h.press('Detectar temas'); h.unmount(); resolve(['Álgebra']); await tick(); assert.equal(h.calls.late, 0);
  });
  console.log(`${passed} escenarios de exámenes por tema aprobados (IA, base de datos e interfaz simuladas).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
