const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '../..');
const ts = require(root + '/node_modules/typescript');
const results = [];
function load(file, mocks) {
  const js = ts.transpileModule(fs.readFileSync(root + '/' + file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const out = {};
  vm.runInNewContext(js, { exports: out, require: name => { if (!(name in mocks)) throw Error(name); return mocks[name]; }, Error, Map, Promise, Uint8Array, String });
  return out;
}
function setup() {
  const s = { user: 'u1', calls: [], tables: { materials: [{id:'m1',user_id:'u1',topics:['Álgebra','Historia'],status:'ready',file_type:'text',file_path:null}], lessons: [], flashcards: [], summaries: [], exams: [] }, storageError: null, queryError: null,
    bytes: Buffer.from('%PDF-valid'), fileSize: 10, fileExists: true, picked: { canceled:false, assets:[{uri:'local.pdf',name:'apuntes.pdf',size:10}] }, camera:true, photoCalls:[], cleanups:0, ai:async () => {}, imageFail:false };
  class Query {
    constructor(table) { this.table=table; this.filters=[]; this.op='select'; }
    select(cols,opts={}) { this.cols=cols;this.opts=opts;return this; }
    eq(k,v) { this.filters.push([k,v,false]);return this; }
    neq(k,v) { this.filters.push([k,v,true]);return this; }
    order() { return this; } limit() { return this; }
    single() { this.singleMode=true;return this; } maybeSingle() { this.maybe=true;return this; }
    insert(values) { this.op='insert';this.values=values;return this; }
    update(values) { this.op='update';this.values=values;return this; }
    delete() { this.op='delete';return this; }
    then(yes,no) { return Promise.resolve().then(()=>this.execute()).then(yes,no); }
    execute() {
      s.calls.push({table:this.table,op:this.op,filters:this.filters,values:this.values});
      if(s.queryError?.(this)) return { data:null,error:{message:'DB error'},count:null };
      let rows=s.tables[this.table].filter(row=>this.filters.every(([k,v,not])=>not?row[k]!==v:row[k]===v));
      if(this.op==='insert') { const row={id:'inserted',...this.values};s.tables[this.table].push(row);rows=[row]; }
      if(this.op==='update') rows.forEach(row=>Object.assign(row,this.values));
      if(this.op==='delete') s.tables[this.table]=s.tables[this.table].filter(row=>!rows.includes(row));
      if(this.singleMode && rows.length!==1) return {data:null,error:{message:'No row'},count:0};
      return {data:this.opts?.head?null:structuredClone(this.singleMode||this.maybe?rows[0]??null:rows),error:null,count:rows.length};
    }
  }
  const supabase={ auth:{getUser:async()=>({data:{user:s.user?{id:s.user}:null},error:null})}, from:t=>new Query(t), storage:{from:()=>({upload:async(path,bytes,options)=>{s.calls.push({op:'storage-upload',path,bytes:bytes.byteLength,options});return {error:s.storageError};}, remove:async(paths)=>{s.calls.push({op:'storage-remove',paths});return {error:s.storageError};}})} };
  const ai={runAi:async(...args)=>{s.calls.push({op:'ai',args});return s.ai(...args);}};
  const common={'../../services/supabase':{supabase},'../../services/ai':ai};
  const materials=load('src/features/materiales/materials.service.ts',{
    ...common,
    'expo-document-picker':{getDocumentAsync:async()=>s.picked},
    'expo-file-system':{File:class { get exists(){return s.fileExists;}get size(){return s.fileSize;}async arrayBuffer(){return Uint8Array.from(s.bytes).buffer;} }},
    'expo-modules-core':{uuid:{v4:()=> 'uuid-1'}},
    'expo-image-picker':{requestCameraPermissionsAsync:async()=>({granted:s.camera}),launchCameraAsync:async(opts)=>{s.photoCalls.push(opts);return s.picked;},launchImageLibraryAsync:async(opts)=>{s.photoCalls.push(opts);return s.picked;}},
    '../../services/PrepararImagen':{prepararImagen:async(uri,mode)=>{s.calls.push({op:'prepare-image',uri,mode});return {uri:'prepared.jpg',mimeType:'image/jpeg',limpiar:()=>s.cleanups++};}},
    '../../services/subirImagen':{crearSubidaImagen:(user,image)=>({id:'image-id',userId:user,uri:image.uri}),subirImagen:async(job)=>{s.calls.push({op:'image-upload',job});if(s.imageFail)throw Error('No connection');return job.id;}}
  });
  const lessons=load('src/features/materiales/prepararLeccionMaterial.ts',{
    ...common,'../../services/estudioIntegracion':{cargarLeccion:async(...args)=>{s.calls.push({op:'load-lesson',args});if(s.invalidLesson)throw Error('Invalid blocks');return {};}}
  });
  return {s,...materials,...lessons};
}
async function test(name, fn) { await fn();results.push({name,passed:true}); }
const aiCalls=s=>s.calls.filter(c=>c.op==='ai');
const generated=s=>s.tables.lessons.push({id:'lesson',user_id:'u1',material_id:'m1',topic:'Álgebra'});
(async()=>{
  await test('Lección existente se reutiliza sin IA',async()=>{const h=setup();generated(h.s);await h.prepararLeccionMaterial('u1','m1','Álgebra');assert.equal(aiCalls(h.s).length,0);assert(h.s.calls.some(c=>c.op==='load-lesson'));});
  await test('Generación utiliza tema elegido y confirma persistencia',async()=>{const h=setup();h.s.ai=async()=>generated(h.s);await h.prepararLeccionMaterial('u1','m1','Álgebra');assert.deepEqual(JSON.parse(JSON.stringify(aiCalls(h.s)[0].args)),['lesson','m1',{topic:'Álgebra'}]);});
  await test('Doble toque comparte una solicitud',async()=>{const h=setup();h.s.ai=async()=>generated(h.s);const a=h.prepararLeccionMaterial('u1','m1','Álgebra'),b=h.prepararLeccionMaterial('u1','m1','Álgebra');assert.equal(a,b);await Promise.all([a,b]);assert.equal(aiCalls(h.s).length,1);});
  await test('Respuesta perdida recupera guardado',async()=>{const h=setup();h.s.ai=async()=>{generated(h.s);throw Error('Network');};await h.prepararLeccionMaterial('u1','m1','Álgebra');assert.equal(aiCalls(h.s).length,1);});
  await test('Error sin guardado no navega ni repite automáticamente',async()=>{const h=setup();h.s.ai=async()=>{throw Error('Quota');};await assert.rejects(h.prepararLeccionMaterial('u1','m1','Álgebra'),/Quota/);assert.equal(aiCalls(h.s).length,1);h.s.ai=async()=>generated(h.s);await h.prepararLeccionMaterial('u1','m1','Álgebra');});
  await test('Respuesta exitosa sin fila se rechaza',async()=>{const h=setup();await assert.rejects(h.prepararLeccionMaterial('u1','m1','Álgebra'),/guardado/);});
  await test('Otra cuenta y material ajeno bloqueados',async()=>{const h=setup();await assert.rejects(h.prepararLeccionMaterial('u2','m1','Álgebra'),/sesión/);h.s.tables.materials[0].user_id='u2';await assert.rejects(h.prepararLeccionMaterial('u1','m1','Álgebra'),/disponible/);assert.equal(aiCalls(h.s).length,0);});
  await test('Tema cambiado y procesamiento bloqueados',async()=>{const h=setup();await assert.rejects(h.prepararLeccionMaterial('u1','m1','Otro'),/tema cambió/);h.s.tables.materials[0].status='processing';await assert.rejects(h.prepararLeccionMaterial('u1','m1','Álgebra'),/procesando/);assert.equal(aiCalls(h.s).length,0);});
  await test('Error de lectura no se convierte en generación duplicada',async()=>{const h=setup();h.s.queryError=q=>q.table==='lessons';await assert.rejects(h.prepararLeccionMaterial('u1','m1','Álgebra'),/comprobar/);assert.equal(aiCalls(h.s).length,0);});
  await test('Bloques inválidos no se abren',async()=>{const h=setup();generated(h.s);h.s.invalidLesson=true;await assert.rejects(h.prepararLeccionMaterial('u1','m1','Álgebra'),/Invalid/);assert.equal(aiCalls(h.s).length,0);});
  await test('Imagen usa servicio común y modo detalle; limpia solo copia',async()=>{const h=setup();assert.equal(await h.uploadImage('u1','library','detalle'),'image-id');assert.equal(h.s.calls.find(c=>c.op==='prepare-image').mode,'detalle');assert.equal(h.s.photoCalls[0].quality,1);assert.equal(h.s.cleanups,1);assert.equal(h.hasPendingImage('u1'),false);});
  await test('Foto fallida conserva operación y copia para reintentar',async()=>{const h=setup();h.s.imageFail=true;await assert.rejects(h.uploadImage('u1','library'),/connection/);assert(h.hasPendingImage('u1'));assert.equal(h.s.cleanups,0);await assert.rejects(h.uploadImage('u1','camera'),/pendiente/);h.s.imageFail=false;await h.retryPendingImage('u1');const jobs=h.s.calls.filter(c=>c.op==='image-upload');assert.equal(jobs[0].job,jobs[1].job);assert.equal(h.s.cleanups,1);});
  await test('Cancelar selector y denegar cámara no sube archivos',async()=>{const h=setup();h.s.picked={canceled:true};assert.equal(await h.uploadImage('u1','library'),null);h.s.camera=false;await assert.rejects(h.uploadImage('u1','camera'),/permiso/);assert.equal(h.s.calls.length,0);});
  await test('Descartar pendiente no borra datos remotos',async()=>{const h=setup();h.s.imageFail=true;await assert.rejects(h.uploadImage('u1','library'));h.discardPendingImage('u1');assert.equal(h.hasPendingImage('u1'),false);assert.equal(h.s.cleanups,1);assert(!h.s.calls.some(c=>c.op==='delete'||c.op==='storage-remove'));});
  await test('PDF válido usa File y nombre UUID',async()=>{const h=setup();assert.equal(await h.uploadPdf('u1'),'uuid-1');assert.equal(h.s.calls.find(c=>c.op==='storage-upload').path,'u1/uuid-1.pdf');});
  await test('PDF cancelado, vacío, grande y falso se rechazan antes de subir',async()=>{const h=setup();h.s.picked={canceled:true};assert.equal(await h.uploadPdf('u1'),null);h.s.picked={canceled:false,assets:[{uri:'a',name:'a.pdf'}]};h.s.fileSize=0;await assert.rejects(h.uploadPdf('u1'));h.s.fileSize=11*1024*1024;await assert.rejects(h.uploadPdf('u1'));h.s.fileSize=20;h.s.bytes=Buffer.from('Not pdf');await assert.rejects(h.uploadPdf('u1'),/PDF válido/);assert(!h.s.calls.some(c=>c.op==='storage-upload'));});
  await test('Subida rechaza cuenta cambiada',async()=>{const h=setup();await assert.rejects(h.uploadPdf('u2'),/cuenta/);await assert.rejects(h.uploadRawText('u2','t','texto'),/cuenta/);assert(!h.s.calls.some(c=>c.op==='insert'||c.op==='storage-upload'));});
  await test('Texto valida, recorta y filtra listado por usuario',async()=>{const h=setup();await assert.rejects(h.uploadRawText('u1',' ','texto'));await h.uploadRawText('u1',' t ',' texto ');assert.equal(h.s.tables.materials[1].title,'t');h.s.tables.materials.push({id:'other',user_id:'u2'});assert.equal((await h.getMaterialsList('u1')).length,2);});
  await test('Edición limpia temas y vuelve a pending',async()=>{const h=setup();await h.updateRawText('m1',' t ',' nuevo ');assert.equal(h.s.tables.materials[0].raw_text,'nuevo');assert.equal(h.s.tables.materials[0].topics.length,0);assert.equal(h.s.tables.materials[0].status,'pending');});
  await test('Edición de material con lecciones o tarjetas preserva historial',async()=>{for(const table of ['lessons','flashcards','summaries','exams']){const h=setup();h.s.tables[table].push({id:'saved',user_id:'u1',material_id:'m1'});await assert.rejects(h.updateRawText('m1','t','nuevo'),/apunte nuevo/);assert(!h.s.calls.some(c=>c.op==='update'));}});
  await test('Edición rechaza fila ajena, no texto o en proceso',async()=>{for(const values of [{user_id:'u2'},{file_type:'pdf'},{status:'processing'}]){const h=setup();Object.assign(h.s.tables.materials[0],values);await assert.rejects(h.updateRawText('m1','t','nuevo'));}});
  await test('Borrado confirma registro antes de Storage',async()=>{const h=setup();h.s.tables.materials[0].file_path='u1/file.pdf';assert.equal(await h.deleteMaterial('m1'),null);const ops=h.s.calls.map(c=>c.op);assert(ops.indexOf('delete')<ops.indexOf('storage-remove'));});
  await test('Fallo de borrado DB no borra archivo',async()=>{const h=setup();h.s.tables.materials[0].file_path='u1/file.pdf';h.s.queryError=q=>q.op==='delete';await assert.rejects(h.deleteMaterial('m1'));assert(!h.s.calls.some(c=>c.op==='storage-remove'));});
  await test('Limpieza Storage fallida informa sin fingir éxito total',async()=>{const h=setup();h.s.tables.materials[0].file_path='u1/file.pdf';h.s.storageError={message:'fail'};assert.match(await h.deleteMaterial('m1'),/no se pudo confirmar/);assert.equal(h.s.tables.materials.length,0);});
  await test('No elimina archivos ajenos ni material en análisis',async()=>{const h=setup();h.s.tables.materials[0].status='processing';await assert.rejects(h.deleteMaterial('m1'),/termine/);h.s.tables.materials[0].status='ready';h.s.tables.materials[0].file_path='u2/foreign.pdf';assert.match(await h.deleteMaterial('m1'),/limpieza/);assert(!h.s.calls.some(c=>c.op==='storage-remove'));});
  await test('Reanálisis fuerza lectura del contenido actual',async()=>{const h=setup();await h.processMaterialTopics('m1');assert.equal(aiCalls(h.s)[0].args[2].force,true);});
  fs.writeFileSync(__dirname+'/services-report.json',JSON.stringify({scenarios:results.length,results},null,2));
  console.log(`${results.length} escenarios de servicios aprobados (simulados, sin red ni escrituras reales).`);
})().catch(e=>{console.error(e);process.exitCode=1;});
