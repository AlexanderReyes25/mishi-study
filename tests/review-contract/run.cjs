const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const source = '2x + 6 = 14\n2x = 8\nx = 4';
const validReview = () => ({ procedureStatus: 'correct', resultStatus: 'correct', summary: 'Los pasos son válidos.',
  steps: [ { quote: '2x = 8', status: 'correct', feedback: 'Restaste seis en ambos lados.' }, { quote: 'x = 4', status: 'correct', feedback: 'Dividiste entre dos.' } ], nextHint: 'Comprueba por sustitución.' });
function load(name, requireMock, extra = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(({ 'review.ts':require('node:path').resolve(__dirname, '../../supabase/functions/_shared/review.ts'), 'ai-review.ts':require('node:path').resolve(__dirname, '../../supabase/functions/ai-review/index.ts') })[name], 'utf8'), {
    fileName: name, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  check(!compiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error), 'Syntax ' + name);
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require: requireMock, ...extra }, { filename: name });
  return module.exports;
}
const parser = load('review.ts', name => { throw Error(name); });
const rejects = (fn, message) => { assert.throws(fn); checks++; };
check(parser.parseReview(validReview(), '2x + 6 = 14\n2x  =\n 8\nx = 4').procedureStatus === 'correct', 'Evidence comparison normalizes whitespace');
check(parser.parseReview(validReview(), source).firstErrorStep === null, 'Correct solution');
const wrong = { procedureStatus: 'incorrect', resultStatus: 'correct', summary: 'El resultado final coincide, pero el paso intermedio falla.',
  steps: [{ quote: '2x = 20', status: 'incorrect', feedback: 'Seis debe restarse de ambos lados.' }, { quote: 'x = 4', status: 'uncertain', feedback: 'No se sigue del paso anterior.' }], nextHint: 'Revisa la resta.' };
check(parser.parseReview(wrong, '2x = 20\nx = 4').firstErrorStep === 1, 'Correct result does not erase wrong steps');
check(parser.parseReview({ ...validReview(), procedureStatus: 'missing', steps: [] }, 'x = 4').procedureStatus === 'missing', 'Only result remains missing procedure');
check(parser.parseReview({ ...validReview(), procedureStatus: 'incomplete', resultStatus: 'not_shown', steps: [validReview().steps[0]] }, source).procedureStatus === 'incomplete', 'Incomplete procedure');
check(parser.parseReview({ ...validReview(), procedureStatus: 'unverifiable', resultStatus: 'unverifiable', steps: [] }, '[ilegible]').procedureStatus === 'unverifiable', 'Unreadable content stays unverified');
rejects(() => parser.parseReview({ ...validReview(), procedureStatus: 'incorrect' }, source), 'Wrong without wrong step');
rejects(() => parser.parseReview({ ...validReview(), steps: [wrong.steps[0]] }, source), 'Invented evidence');
rejects(() => parser.parseReview({ ...validReview(), steps: [...validReview().steps].reverse() }, source), 'Order must match source');
rejects(() => parser.parseReview({ ...validReview(), steps: [validReview().steps[0], validReview().steps[0]] }, source), 'Evidence not duplicated');
rejects(() => parser.parseReview({ ...validReview(), procedureStatus: 'missing' }, source), 'No invented steps for missing work');
rejects(() => parser.parseReview({ ...validReview(), resultStatus: 'incorrect' }, source), 'Correct procedure cannot have incorrect final result');
rejects(() => parser.parseReview({ ...validReview(), procedureStatus: 'incomplete', steps: [] }, source), 'Incomplete requires visible steps');
rejects(() => parser.parseReview({ ...wrong, procedureStatus: 'correct' }, '2x = 20\nx = 4'), 'Contradictory conclusion');
rejects(() => parser.parseReview(validReview(), source + ' [ilegible]'), 'Unreadable never approved');
rejects(() => parser.validateReviewInput('', source), 'Missing exercise');
rejects(() => parser.validateReviewInput('x'.repeat(4001), source), 'Oversize exercise');
rejects(() => parser.validateReviewInput('Exercise', 'x'.repeat(12001)), 'Oversize procedure');
check(parser.parseTranscription({ text: '2x = 20\nx = 4', legible: true, uncertain: [] }).text.includes('20'), 'Transcription preserves student error');
check(!parser.parseTranscription({ text: '2x = [ilegible]', legible: false, uncertain: ['No se lee el segundo número.'] }).legible, 'Ambiguity exposed');
rejects(() => parser.parseTranscription({ text: '[ilegible]', legible: true, uncertain: [] }), 'Legible flag cannot contradict placeholders');
rejects(() => parser.parseTranscription({ text: '', legible: true, uncertain: [] }), 'Empty image not marked legible');
rejects(() => parser.parseTranscription({ text: '', legible: false, uncertain: [] }), 'Uncertainty requires explanation');

let handler, geminiCalls = [], upstreamStatus = 200, generated = validReview(), authorized = true, finishReason = 'STOP', rawOutput, timeout = false;
const env = { SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'test-anon', GEMINI_API_KEY: 'test-secret' };
load('ai-review.ts', name => {
  if (name.endsWith('/review.ts')) return parser;
  if (name.startsWith('npm:')) return { createClient: () => ({ auth: { getUser: async token => ({ data: { user: authorized && token === 'test-session' ? { id: 'user-1' } : null }, error: null }) } }) };
  throw Error(name);
}, {
  Deno: { env: { get: name => env[name] }, serve: callback => { handler = callback; } },
  Request, Response, Uint8Array, TextDecoder, AbortController, atob,
  setTimeout: (callback) => timeout ? setTimeout(callback, 1) : setTimeout(callback, 45000), clearTimeout,
  fetch: async (_url, options) => {
    geminiCalls.push(JSON.parse(options.body));
    if (timeout) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted'))));
    return new Response(JSON.stringify({ candidates: [{ finishReason, content: { parts: [{ text: rawOutput ?? JSON.stringify(generated) }] } }] }), { status: upstreamStatus });
  },
});
const request = (body, token = 'test-session') => new Request('https://example.test/ai-review', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});
const body = { action: 'review', exercise: 'Resuelve 2x + 6 = 14.', procedure: source };
async function status(req, expected, message) {
  const response = await handler(req); check(response.status === expected, message + ` (${response.status})`); return response;
}
(async () => {
  await status(new Request('https://example.test', { method: 'OPTIONS' }), 200, 'CORS');
  await status(new Request('https://example.test'), 405, 'Method');
  await status(request(body, null), 401, 'Missing session');
  await status(request(body, 'bad-session'), 401, 'Invalid session');
  check(geminiCalls.length === 0, 'No AI before authentication');
  await status(request({ action: 'other' }), 400, 'Invalid action');
  await status(request({ ...body, exercise: '' }), 400, 'Empty exercise');
  await status(request({ ...body, procedure: 'a'.repeat(12001) }), 400, 'Oversize procedure');
  check(geminiCalls.length === 0, 'Invalid input does not spend AI');
  const ok = await status(request(body), 200, 'Valid review');
  check((await ok.json()).procedureStatus === 'correct', 'Validated result returned');
  const sent = geminiCalls.at(-1);
  check(JSON.parse(sent.contents[0].parts[0].text).procedimiento_del_estudiante === source, 'Student data passed without replacing it');
  check(sent.systemInstruction.parts[0].text.includes('DATOS'), 'Separate system rules');
  generated = { ...validReview(), steps: [{ quote: 'x = 50', status: 'correct', feedback: 'Fake' }] };
  await status(request(body), 502, 'Fabricated evidence blocked');
  generated = validReview();
  rawOutput = '{broken'; await status(request(body), 502, 'Malformed JSON blocked'); rawOutput = undefined;
  finishReason = 'MAX_TOKENS'; await status(request(body), 502, 'Truncation blocked'); finishReason = 'STOP';
  upstreamStatus = 429; await status(request(body), 429, 'Quota error');
  upstreamStatus = 503; await status(request(body), 502, 'Upstream failure'); upstreamStatus = 200;
  timeout = true; await status(request(body), 504, 'Timeout'); timeout = false;
  const jpeg = Buffer.from([255, 216, 255, 219, 1, 2, 3]).toString('base64');
  generated = { text: '2x = 20\nx = 4', legible: true, uncertain: [] };
  const transcription = await status(request({ action: 'transcribe', imageBase64: jpeg }), 200, 'Photo transcription');
  check((await transcription.json()).text.includes('20'), 'No automatic student-error correction');
  check(geminiCalls.at(-1).contents[0].parts[0].inlineData.mimeType === 'image/jpeg', 'JPEG sent');
  const beforeInvalidImage = geminiCalls.length;
  await status(request({ action: 'transcribe', imageBase64: 'not-a-jpeg' }), 400, 'Invalid base64');
  await status(request({ action: 'transcribe', imageBase64: Buffer.from('text').toString('base64') }), 400, 'Non-image blocked');
  await status(request({ action: 'transcribe', imageBase64: 'A'.repeat(4 * 1024 * 1024 + 4) }), 413, 'Oversize image');
  check(geminiCalls.length === beforeInvalidImage, 'Invalid photos never call AI');
  const hugeRequest = new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer test-session' }, body: 'x'.repeat(4 * 1024 * 1024 + 65537) });
  await status(hugeRequest, 413, 'Streaming body limit without Content-Length');
  console.log(`${checks} comprobaciones de contrato y Edge Function pasaron (Supabase y Gemini simulados).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
