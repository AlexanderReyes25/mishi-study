const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error, require: name => {
    if (!(name in mocks)) throw Error('Unexpected import: ' + name);
    return mocks[name];
  } });
  return module.exports;
}
const state = load('src/features/examenes/examState.ts');
const q = id => ({ id, type: 'multiple_choice', question: 'Pregunta', options: ['A', 'B'], topic: 'Álgebra' });
const answer = id => ({ questionId: id, userAnswer: 'A', correctAnswer: 'A', isCorrect: true, explanation: null });
const run = () => ({ materialId: 'm1', session: { examId: 'e1', title: 'Álgebra', kind: 'diagnostic', questions: ['q1', 'q2', 'q3'].map(q) }, index: 0, answers: {}, saved: null });
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('OK ' + name); }

function services(options = {}) {
  const calls = [];
  const s = { attempt: null, answers: [], recorded: false, ...options };
  const supabase = { from(table) {
    let operation = 'select', values, columns, filters = [], count = false;
    const query = {
      select(c, o = {}) { columns = c; count = !!o.count; return query; },
      eq(k, v) { filters.push([k, v]); return query; },
      order() { return query; }, limit() { return query; },
      single() { return query; }, maybeSingle() { return query; },
      insert(v) { operation = 'insert'; values = v; return query; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        calls.push({ table, operation, values, columns, filters });
        if (s.fail?.(table, operation)) return { error: { message: 'offline' } };
        if (table === 'exam_questions') return { data: { correct_answer: '  VERDADERO ', explanation: 'Porque…' } };
        if (table === 'exam_attempts') {
          if (operation === 'insert') s.attempt = { id: 'a1', score: 0, total: 0, finished_at: null };
          return { data: s.attempt };
        }
        if (table === 'attempt_answers') {
          if (count) return { count: s.answers.length };
          s.answers.push(...values); return { error: null };
        }
        throw Error('Unexpected table ' + table);
      }).then(resolve, reject); },
    }; return query;
  } };
  return { s, calls, ...load('src/services/exams.ts', {
    './supabase': { supabase }, './ai': { runAi: async () => s.aiResult },
    './progress': { recordAttempt: async () => {
      calls.push({ rpc: true }); if (s.rpcError) throw Error('offline');
      if (!s.unconfirmed) Object.assign(s.attempt, { score: s.answers.filter(a => a.is_correct).length, total: s.answers.length, finished_at: '2026-10-22' });
    } },
  }) };
}
const tick = async () => { for (let n=0;n<10;n++) await Promise.resolve(); };
const gate = () => { let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; };
function provider(mocks = {}) {
  let cursor = 0, hooks = [], effects = [], mounted = true, late = 0, tree;
  const calls = { start: 0, check: 0, save: 0, clear: 0 };
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useContext: () => tree.props.value,
    useRef(v) { const i=cursor++; return hooks[i] ??= {current:v}; },
    useState(v) { const i=cursor++;if(!(i in hooks))hooks[i]=v;return [hooks[i],value=>{if(!mounted)late++;hooks[i]=typeof value==='function'?value(hooks[i]):value;}]; },
    useEffect(fn) { const i=cursor++; if(!(i in hooks)){hooks[i]=true;effects.push(fn);} },
  };
  const C = load('src/features/examenes/ExamProvider.tsx', {
    react, 'react/jsx-runtime': {jsx:(type,props)=>({type,props})}, '../../services/session':{useSession:()=>({userId:'u1'})},
    '../../services/exams': {
      createExam: async()=>{calls.start++;return mocks.start ? mocks.start.promise : run().session;},
      gradeAnswer: async(id)=>{calls.check++;return mocks.check ? mocks.check.promise : answer(id);},
      saveAttempt: async()=>{calls.save++;if(mocks.saveError)throw Error('Sin conexión');return mocks.save ? mocks.save.promise : {attemptId:'a1',score:3,total:3};},
    },
    './lessonCache':{forgetLessons(){},clearLessons(){calls.clear++;}},'./examState':state,
  }).ExamProvider;
  let cleanups=[];
  const h={ calls, render(){cursor=0;tree=C({children:null});cleanups.push(...effects.splice(0).map(fn=>fn()));return tree.props.value;},unmount(){mounted=false;cleanups.forEach(fn=>fn?.());},get late(){return late;} };
  h.render();return h;
}
(async()=>{
  await test('No avanza sin comprobar; el doble toque no salta preguntas',()=>{
    let r=run();assert.equal(state.advanceQuestion(r,'q1'),r);r.answers.q1=answer('q1');r=state.advanceQuestion(r,'q1');assert.equal(r.index,1);assert.equal(state.advanceQuestion(r,'q1'),r);assert.equal(state.advanceQuestion(r,'q2'),r);
  });
  await test('No guarda un examen incompleto; conserva el orden al completarlo',()=>{
    const r=run();r.answers.q3=answer('q3');assert.throws(()=>state.completeAnswers(r),/todas/);r.answers.q2=answer('q2');r.answers.q1=answer('q1');assert.equal(state.completeAnswers(r).map(a=>a.questionId).join(','),'q1,q2,q3');
  });
  await test('Corrige ignorando espacios y mayúsculas',async()=>{const x=services();assert((await x.gradeAnswer('q1','verdadero')).isCorrect);assert(!(await x.gradeAnswer('q1','falso')).isCorrect);});
  await test('Filtra preguntas abiertas y respeta orden de la IA',async()=>{const x=services({aiResult:{exam:{id:'e1',kind:'diagnostic',title:'T'},questions:[{...q('q2'),position:2},{...q('q0'),type:'open',position:0},{...q('q1'),position:1}]}});assert.equal((await x.createExam('m1','diagnostic',{count:3})).questions.map(q=>q.id).join(','),'q1,q2');});
  await test('Rechaza examen sin preguntas compatibles',async()=>{await assert.rejects(services({aiResult:{exam:{},questions:[]}}).createExam('m1','diagnostic',{count:3}));});
  await test('Guardar y reintentar no repite escrituras confirmadas',async()=>{const x=services();const a=await x.saveAttempt('e1','u1',[answer('q1')]);assert.equal(a.total,1);await x.saveAttempt('e1','u1',[answer('q1')]);assert.equal(x.calls.filter(c=>c.operation==='insert').length,2);assert.equal(x.calls.filter(c=>c.rpc).length,1);});
  await test('Fallo del RPC conserva respuestas y permite reintentar',async()=>{const x=services({rpcError:true});await assert.rejects(x.saveAttempt('e1','u1',[answer('q1')]));x.s.rpcError=false;assert.equal((await x.saveAttempt('e1','u1',[answer('q1')])).total,1);assert.equal(x.s.answers.length,1);});
  await test('No muestra resultado guardado si finished_at sigue vacío',async()=>{await assert.rejects(services({unconfirmed:true}).saveAttempt('e1','u1',[answer('q1')]),/confirmado/);});
  await test('Fallo al guardar respuestas no llama al registro de progreso',async()=>{const x=services({fail:(t,op)=>t==='attempt_answers'&&op==='insert'});await assert.rejects(x.saveAttempt('e1','u1',[answer('q1')]));assert(!x.calls.some(c=>c.rpc));});
  await test('Provider comparte generación y comprobación con doble toque',async()=>{
    const start=gate(),check=gate(),h=provider({start,check});let p=h.render();const a=p.startExam('m1','diagnostic',{count:3}),b=p.startExam('m1','diagnostic',{count:3});assert.equal(a,b);assert.equal(h.calls.start,1);start.resolve(run().session);await a;p=h.render();const c=p.checkAnswer(q('q1'),'A'),d=p.checkAnswer(q('q1'),'A');assert.equal(c,d);check.resolve(answer('q1'));await c;p=h.render();assert(p.run.answers.q1);p.goNext('q1');p.goNext('q1');assert.equal(h.render().run.index,1);
  });
  await test('Provider no guarda hasta completar todas las preguntas',async()=>{const h=provider();await h.render().startExam('m1','diagnostic',{count:3});await assert.rejects(h.render().finishExam(),/todas/);assert.equal(h.calls.save,0);});
  await test('Provider conserva las respuestas si falla el guardado',async()=>{const m={saveError:true},h=provider(m);await h.render().startExam('m1','diagnostic',{count:3});for(const id of ['q1','q2','q3']){await h.render().checkAnswer(q(id),'A');h.render().goNext(id);}await assert.rejects(h.render().finishExam());assert.equal(Object.keys(h.render().run.answers).length,3);assert.equal(h.render().run.saved,null);m.saveError=false;await h.render().finishExam();assert.equal(h.render().run.saved.total,3);});
  await test('Cerrar sesión durante generación evita actualizar estado desmontado',async()=>{const start=gate(),h=provider({start});const p=h.render().startExam('m1','diagnostic',{count:3});h.unmount();start.resolve(run().session);await p;assert.equal(h.late,0);});
  await test('Cache comparte solicitud, elimina rechazos y se limpia al salir',async()=>{let count=0;let fail=true;const c=load('src/features/examenes/lessonCache.ts',{'../../services/exams':{fetchLesson:async()=>{count++;if(fail)throw Error('offline');return {title:'Tema',lesson:'Texto',blocks:[],round:1};}}});const a=c.getLesson('u1','m1','T');assert.equal(a,c.getLesson('u1','m1','T'));await assert.rejects(a);await tick();fail=false;await c.getLesson('u1','m1','T');await c.getLesson('u1','m1','T');assert.equal(count,2);c.clearLessons();await c.getLesson('u1','m1','T');assert.equal(count,3);await c.getLesson('u2','m1','T');assert.equal(count,4);await assert.rejects(c.getLesson('','m1','T'));assert.equal(count,4);});
  console.log(`${passed} escenarios de exámenes aprobados (servicios simulados).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
