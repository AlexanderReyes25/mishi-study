const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(({ 'review.ts':require('node:path').resolve(__dirname, '../../supabase/functions/_shared/review.ts'), 'revisarProcedimiento.ts':require('node:path').resolve(__dirname, '../../src/services/revisarProcedimiento.ts'), 'PracticaScreen.tsx':require('node:path').resolve(__dirname, '../../src/features/practica/PracticaScreen.tsx'), 'PracticaView.tsx':require('node:path').resolve(__dirname, '../../src/features/practica/PracticaView.tsx'), 'ReviewResultView.tsx':require('node:path').resolve(__dirname, '../../src/features/practica/ReviewResultView.tsx') })[file], 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name in mocks) return mocks[name];
    throw Error('Missing mock ' + name);
  } });
  return module.exports;
}
const parser = load('review.ts', {});
let fileSize = 100, fileExists = true, fileReadError = false, cleanup = 0, uploads = [], modes = [], apiError = null;
let apiData = { text: '2x = 8\nx = 4', legible: true, uncertain: [] };
const service = load('revisarProcedimiento.ts', {
  'expo-file-system': { File: class { get exists() { return fileExists; } get size() { return fileSize; } async base64() { if (fileReadError) throw Error('No se puede leer'); return '/9j/AA=='; } } },
  '../../supabase/functions/_shared/review': parser,
  './PrepararImagen': { prepararImagen: async (_uri, mode) => { modes.push(mode); return { uri: 'temporary-copy', limpiar() { cleanup++; } }; } },
  './supabase': { supabase: { functions: { invoke: async (name, options) => { uploads.push({ name, ...options }); return { data: apiData, error: apiError }; } } } },
});

let active;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const react = {
  useState(initial) { const host = active, index = host.cursor++;
    if (!(index in host.hooks)) host.hooks[index] = initial;
    return [host.hooks[index], value => { if (!host.mounted) host.late++; host.hooks[index] = typeof value === 'function' ? value(host.hooks[index]) : value; }]; },
  useRef(initial) { const host = active, index = host.cursor++; return host.hooks[index] ??= { current: initial }; },
  useEffect(callback, deps) { const host = active, index = host.cursor++, old = host.hooks[index];
    if (!old || !sameDeps(old.deps, deps)) host.effects.push(() => { old?.cleanup?.(); host.hooks[index] = { deps, cleanup: callback() }; }); },
};
const jsx = (type, props, key) => typeof type === 'function' ? type(props) : ({ type, props: props ?? {}, key });
function mount(Component) {
  const host = { hooks: [], cursor: 0, effects: [], mounted: true, late: 0, tree: null,
    render() { this.cursor = 0; active = this; this.tree = Component(); active = undefined; this.effects.splice(0).forEach(fn => fn()); },
    unmount() { this.mounted = false; this.hooks.forEach(hook => hook?.cleanup?.()); },
  }; host.render(); return host;
}
function flatten(tree) {
  if (Array.isArray(tree)) return tree.flatMap(flatten);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...flatten(tree.props?.children)];
}
const button = (host, label) => flatten(host.tree).find(node => node.type === 'Button' && node.props.label === label);
const input = (host, label) => flatten(host.tree).find(node => node.type === 'TextInput' && node.props.accessibilityLabel === label);
const texts = host => flatten(host.tree).filter(n => n.type === 'Text').map(n => n.props.children).flat().join(' ');
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const valid = { procedureStatus: 'correct', resultStatus: 'correct', summary: 'Bien.', steps: [{ quote: 'x = 4', status: 'correct', feedback: 'Bien.' }], nextHint: 'Comprueba.', firstErrorStep: null };
let userId = 'user-1', permission = true, picked = { canceled: false, assets: [{ uri: 'original-photo' }] }, cameraCalls = 0, reads = 0, reviews = [], readGate = null, reviewGate = null;
let reading = { text: '2x = 8\nx = 4', legible: true, uncertain: [] };

const viewMocks={
 'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
 'react-native':{Text:'Text',TextInput:'TextInput',View:'View'},
 'expo-image':{Image:'Image'},'@expo/vector-icons':{Ionicons:'Ionicons'},
 '../../components/Button':{Button:'Button'},'../../components/Card':{Card:'Card'},
 '../../components/MathText':{RichText:'RichText'},
 '../../components/MishiUI':{Page:'Page',SectionHeading:'SectionHeading',Tag:'Tag',BusyLine:'BusyLine',Notice:({text})=>jsx('Text',{children:text}),ui:{}},
 '../../theme':{colors:{},spacing:{}},'../../../supabase/functions/_shared/review':parser,
};
viewMocks['./ReviewResultView']=load('ReviewResultView.tsx',viewMocks);
const {PracticaView}=load('PracticaView.tsx',viewMocks);

const { PracticaScreen: PracticaScreen } = load('PracticaScreen.tsx', {
 './PracticaView':{PracticaView},
  react,
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
  'react-native': { Text: 'Text', View: 'View', TextInput: 'TextInput', StyleSheet: { create: value => value }, Keyboard: { dismiss() {} } },
  'expo-image': { Image: 'Image' },
  'expo-image-picker': { requestCameraPermissionsAsync: async () => ({ granted: permission, canAskAgain: true }),
    launchCameraAsync: async () => { cameraCalls++; return picked; }, launchImageLibraryAsync: async () => picked },
  '../../../supabase/functions/_shared/review': parser,
  '../../components/Button': { Button: 'Button' }, '../../components/Card': { Card: 'Card' },
  '../../components/MathText': { RichText: 'RichText' },
  '../../services/revisarProcedimiento': {
    leerProcedimientoDeFoto: async () => { reads++; return readGate ? readGate.promise : reading; },
    revisarProcedimiento: async (exercise, procedure) => { reviews.push({ exercise, procedure }); return reviewGate ? reviewGate.promise : valid; },
  },
  '../../services/session': { useSession: () => ({ userId }) },
  '../../theme': { colors: {}, font: {}, radius: {}, spacing: {} },
});

(async () => {
  const first = await service.leerProcedimientoDeFoto('original');
  check(first.text === apiData.text && cleanup === 1, 'Photo parsed and temporary cleaned');
  check(modes[0] === 'detalle' && uploads[0].name === 'ai-review', 'Detail preset and separate function');
  check(uploads[0].body.action === 'transcribe' && !('uri' in uploads[0].body), 'Only encoded photo sent, never device path');
  fileSize = parser.MAX_REVIEW_IMAGE_BYTES + 1;
  await assert.rejects(() => service.leerProcedimientoDeFoto('original', 'normal')); checks++;
  check(uploads.length === 1 && cleanup === 2, 'Oversize blocked before API and temporary cleaned');
  fileSize = 100; fileReadError = true;
  await assert.rejects(() => service.leerProcedimientoDeFoto('original')); checks++;
  check(cleanup === 3 && uploads.length === 1, 'Read failure also cleaned'); fileReadError = false;
  apiError = { message: 'non-2xx', context: { json: async () => ({ error: 'Límite de IA' }) } };
  await assert.rejects(() => service.leerProcedimientoDeFoto('original'), /Límite de IA/); checks++;
  check(cleanup === 4, 'Network/API failure cleans copy'); apiError = null;
  apiData = { text: '', legible: true, uncertain: [] };
  await assert.rejects(() => service.leerProcedimientoDeFoto('original')); checks++;
  check(cleanup === 5, 'Invalid transcription cleans copy');
  apiData = valid;
  await service.revisarProcedimiento('2x + 6 = 14', 'x = 4');
  check(uploads.at(-1).body.action === 'review' && !uploads.at(-1).body.imageBase64, 'Review sends text, does not resend image');
  const count = uploads.length;
  await assert.rejects(() => service.revisarProcedimiento('', 'x = 4')); checks++;
  check(uploads.length === count, 'Invalid text never invokes backend');

  const host = mount(PracticaScreen);
  check(button(host, 'Revisar mi procedimiento').props.disabled, 'Empty form disabled');
  input(host, 'Enunciado del ejercicio').props.onChangeText('Resuelve 2x + 6 = 14.'); host.render();
  input(host, 'Procedimiento del estudiante').props.onChangeText('2x = 8\nx = 4'); host.render();
  check(!button(host, 'Revisar mi procedimiento').props.disabled, 'Written procedure available');
  await button(host, 'Revisar mi procedimiento').props.onPress(); host.render();
  check(reviews.length === 1 && texts(host).includes('Tu procedimiento va bien'), 'Text review displayed');
  input(host, 'Procedimiento del estudiante').props.onChangeText('x = 4'); host.render();
  check(!texts(host).includes('Tu procedimiento va bien'), 'Editing clears stale review');
  await button(host, 'Leer foto').props.onPress(); host.render();
  check(reads === 1 && input(host, 'Procedimiento del estudiante').props.value === reading.text, 'Gallery fills editable transcription');
  check(button(host, 'Revisar mi procedimiento').props.disabled, 'Photo must be confirmed');
  await button(host, 'Revisar mi procedimiento').props.onPress(); host.render();
  check(reviews.length === 1, 'Handler also enforces photo confirmation');
  button(host, 'El texto coincide con mi trabajo').props.onPress(); host.render();
  check(!button(host, 'Revisar mi procedimiento').props.disabled, 'Confirmed photo can be reviewed');
  input(host, 'Procedimiento del estudiante').props.onChangeText('2x = 8\nx = 4.'); host.render();
  check(button(host, 'Revisar mi procedimiento').props.disabled, 'Editing requires fresh confirmation');
  picked = { canceled: true };
  await button(host, 'Leer foto').props.onPress(); host.render();
  check(input(host, 'Procedimiento del estudiante').props.value === '2x = 8\nx = 4.', 'Cancel preserves draft');
  picked = { canceled: false, assets: [{ uri: 'new-photo' }] }; permission = false;
  await button(host, 'Usar cámara').props.onPress(); host.render();
  check(cameraCalls === 0 && reads === 1, 'Denied camera never opens or invokes AI'); permission = true;
  reading = { text: '2x = [ilegible]', legible: false, uncertain: ['No se ve el número.'] };
  await button(host, 'Usar cámara').props.onPress(); host.render();
  check(cameraCalls === 1 && texts(host).includes('No se ve el número.'), 'Uncertainty displayed after camera reading');
  check(button(host, 'El texto coincide con mi trabajo').props.disabled, 'Unreadable placeholder cannot be confirmed');
  button(host, 'Continuar solo con texto').props.onPress(); host.render();
  await button(host, 'Revisar mi procedimiento').props.onPress(); host.render();
  check(reviews.length === 1, 'Switching to text does not bypass unreadable validation');
  input(host, 'Procedimiento del estudiante').props.onChangeText('2x = 8\nx = 4'); host.render();
  reviewGate = deferred();
  const reviewing = button(host, 'Revisar mi procedimiento').props.onPress();
  await button(host, 'Revisar mi procedimiento').props.onPress(); host.render();
  check(reviews.length === 2, 'Concurrent duplicate review prevented');
  check(button(host, 'Leer foto').props.disabled && !input(host, 'Procedimiento del estudiante').props.editable, 'Inputs disabled during review');
  host.unmount(); reviewGate.resolve(valid); await reviewing;
  check(host.late === 0, 'No state update after review unmount'); reviewGate = null;
  const photoHost = mount(PracticaScreen);
  readGate = deferred();
  const readingPromise = button(photoHost, 'Leer foto').props.onPress();
  await Promise.resolve(); await Promise.resolve();
  photoHost.unmount(); readGate.resolve(reading); await readingPromise;
  check(photoHost.late === 0, 'No state update after photo unmount'); readGate = null;
  userId = null;
  const anonymous = mount(PracticaScreen);
  const readsBefore = reads;
  await button(anonymous, 'Leer foto').props.onPress();
  check(reads === readsBefore && button(anonymous, 'Leer foto').props.disabled, 'No reading without session');
  anonymous.unmount();
  console.log(`${checks} comprobaciones de servicio e interfaz pasaron (simulación de hooks, cámara y red).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
