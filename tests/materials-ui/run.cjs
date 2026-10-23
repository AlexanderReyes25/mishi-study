const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname, '../..');
const ts=require(root+'/node_modules/typescript');
let active;
const depsSame=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
const react={
 useState(initial){const h=active,i=h.cursor++;if(!(i in h.hooks))h.hooks[i]=typeof initial==='function'?initial():initial;return [h.hooks[i],v=>{if(!h.mounted)h.late++;h.hooks[i]=typeof v==='function'?v(h.hooks[i]):v;}];},
 useRef(v){const h=active,i=h.cursor++;return h.hooks[i]??={current:v};},
 useCallback(fn,deps){const h=active,i=h.cursor++;if(!h.hooks[i]||!depsSame(h.hooks[i].deps,deps))h.hooks[i]={deps,fn};return h.hooks[i].fn;},
 useMemo(fn,deps){const h=active,i=h.cursor++;if(!h.hooks[i]||!depsSame(h.hooks[i].deps,deps))h.hooks[i]={deps,value:fn()};return h.hooks[i].value;},
 useEffect(fn,deps){const h=active,i=h.cursor++,old=h.hooks[i];if(!old||!depsSame(old.deps,deps))h.effects.push(()=>{old?.cleanup?.();h.hooks[i]={deps,cleanup:fn()};});}
};
const jsx=(type,props,key)=>({type,props:props??{},key});
const nodes=v=>Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];
function find(h,type,p=()=>true){return nodes(h.tree).find(n=>n.type===type&&p(n));}
const button=(h,label)=>label.startsWith('Estudiar: ')?find(h,'ChoiceTile',n=>n.props.title===label.slice(10)):find(h,'Button',n=>n.props.label===label)||find(h,'ChoiceTile',n=>n.props.title===label);
function mount(C,props){const h={cursor:0,hooks:[],effects:[],mounted:true,late:0,render(){this.cursor=0;active=this;this.tree=C(props);active=null;this.effects.splice(0).forEach(f=>f());return this;},unmount(){this.mounted=false;this.hooks.forEach(h=>h?.cleanup?.());}};return h.render();}
const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const gate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function setup(overrides={}){
 const s={rows:[{id:'m1',title:'Apuntes',file_type:'text',status:'ready',topics:['Álgebra','Historia'],raw_text:'Texto',created_at:'2026-10-20T10:00:00Z'}],calls:[],alerts:[],nav:[],pending:false,intervals:[],...overrides};
 const services={
   getMaterialsList:async()=>{s.calls.push(['list']);return structuredClone(s.rows);},
   processMaterialTopics:async id=>{s.calls.push(['topics',id]);},
   uploadRawText:async(...a)=>{s.calls.push(['text',...a]);if(s.textGate)return s.textGate.promise;return 'new-text';},
   uploadImage:async(...a)=>{s.calls.push(['image',...a]);return s.photoResult===undefined?'photo-id':s.photoResult;},
   uploadPdf:async()=>{s.calls.push(['pdf']);return null;},
   updateRawText:async(...a)=>{s.calls.push(['edit',...a]);if(s.editGate)return s.editGate.promise;},
   deleteMaterial:async(...a)=>{s.calls.push(['delete',...a]);return null;},
   hasPendingImage:()=>s.pending,retryPendingImage:async()=>{s.calls.push(['retry-photo']);s.pending=false;return 'photo-id';},discardPendingImage:()=>{s.calls.push(['discard']);s.pending=false;}
 };
 const mocks={react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
  'expo-router':{router:{push:r=>s.nav.push(['push',r]),navigate:r=>s.nav.push(['navigate',r])},useFocusEffect:fn=>react.useEffect(fn,[fn])},
  'react-native':{ActivityIndicator:'ActivityIndicator',Alert:{alert:(...a)=>s.alerts.push(a)},Modal:'Modal',ScrollView:'ScrollView',StyleSheet:{create:v=>v},Text:'Text',TextInput:'TextInput',TouchableOpacity:'TouchableOpacity',View:'View'},
  '../../components/Button':{Button:'Button'},'../../components/Card':{Card:'Card'},'../../components/Screen':{Screen:'Screen'},'../../components/PantallaCarga':{PantallaCarga:'PantallaCarga'},
  '../../theme':{colors:{primary:'blue'},font:{},spacing:{}},'./materials.service':services,
 './BibliotecaView':{BibliotecaView:'BibliotecaView',MaterialStatus:'MaterialStatus'},
 '../../components/MishiUI':{BusyLine:'BusyLine',ChoiceTile:'ChoiceTile',Notice:'Notice',SectionHeading:'SectionHeading',Sheet:'Sheet',Tag:'Tag',ui:{}},
  './prepararLeccionMaterial':{prepararLeccionMaterial:async(...a)=>{s.calls.push(['lesson',...a]);if(s.lessonGate)return s.lessonGate.promise;}}
 };
 const source=fs.readFileSync(root+'/src/features/materiales/MaterialesScreen.tsx','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const out={};
 vm.runInNewContext(js,{exports:out,require:n=>{if(!(n in mocks))throw Error(n);return mocks[n];},setInterval:fn=>{const item={fn,cleared:false};s.intervals.push(item);return item;},clearInterval:i=>{i.cleared=true;},Error});
 const h=mount(out.MaterialesScreen,{userId:'u1'});
 return {s,h};
}
async function ready(x){await tick();x.h.render();return x;}
function detail(x){const list=find(x.h,'BibliotecaView');assert(list.props.materials.length,'Material visible');list.props.onOpen(list.props.materials[0]);x.h.render();}
const results=[];
async function test(name,fn){await fn();results.push({name,passed:true});}
(async()=>{
 await test('Carga Materiales por usuario y ofrece todos los temas',async()=>{const x=await ready(setup());detail(x);assert(button(x.h,'Estudiar: Álgebra'));assert(button(x.h,'Estudiar: Historia'));});
 await test('Elegir tema muestra Mishi y abre ruta de Kevin con material y tema',async()=>{const g=gate(),x=await ready(setup({lessonGate:g}));detail(x);const work=button(x.h,'Estudiar: Historia').props.onPress();x.h.render();assert(find(x.h,'PantallaCarga'));assert.equal(button(x.h,'Subir un PDF').props.disabled,true);g.resolve();await work;x.h.render();assert.equal(x.s.nav[0][1].pathname,'/estudio/leccion');assert.equal(x.s.nav[0][1].params.materialId,'m1');assert.equal(x.s.nav[0][1].params.topic,'Historia');});
 await test('Doble toque en tema inicia una sola preparación',async()=>{const g=gate(),x=await ready(setup({lessonGate:g}));detail(x);const action=button(x.h,'Estudiar: Álgebra').props.onPress;const work=action();await action();assert.equal(x.s.calls.filter(c=>c[0]==='lesson').length,1);g.resolve();await work;});
 await test('Volver a Inicio no fuerza navegación al terminar; conserva botón Abrir',async()=>{const g=gate(),x=await ready(setup({lessonGate:g}));detail(x);const work=button(x.h,'Estudiar: Álgebra').props.onPress();x.h.render();find(x.h,'PantallaCarga').props.onClose();g.resolve();await work;x.h.render();assert.equal(x.s.nav.length,1);assert.equal(x.s.nav[0][0],'navigate');assert(button(x.h,'Abrir lección'));});
 await test('Fallo al preparar permite volver a intentar sin abrir lección',async()=>{const g=gate(),x=await ready(setup({lessonGate:g}));detail(x);const work=button(x.h,'Estudiar: Álgebra').props.onPress();g.reject(Error('Quota'));await work;x.h.render();assert.equal(x.s.nav.length,0);assert.equal(x.s.alerts.at(-1)[1],'Quota');detail(x);assert.equal(button(x.h,'Estudiar: Álgebra').props.disabled,false);});
 await test('Cerrar sesión durante generación no muestra datos ni navega después',async()=>{const g=gate(),x=await ready(setup({lessonGate:g}));detail(x);const work=button(x.h,'Estudiar: Álgebra').props.onPress();x.h.unmount();g.resolve();await work;assert.equal(x.h.late,0);assert.equal(x.s.nav.length,0);});
 await test('Cámara y galería conservan modo de calidad y detectan temas',async()=>{const x=await ready(setup());button(x.h,'Fotos: calidad normal').props.onPress();x.h.render();await button(x.h,'Tomar una foto').props.onPress();await tick();x.h.render();assert.deepEqual(x.s.calls.find(c=>c[0]==='image'),['image','u1','camera','detalle']);assert(x.s.calls.some(c=>c[0]==='topics'&&c[1]==='photo-id'));});
 await test('Cancelar selector no llama IA',async()=>{const x=await ready(setup({photoResult:null}));await button(x.h,'Elegir de la galería').props.onPress();await tick();assert(!x.s.calls.some(c=>c[0]==='topics'));});
 await test('Foto pendiente ofrece reintento y bloquea una nueva selección',async()=>{const x=await ready(setup({pending:true}));assert.equal(button(x.h,'Elegir de la galería').props.disabled,true);await button(x.h,'Reintentar fotografía pendiente').props.onPress();x.h.render();assert(!button(x.h,'Reintentar fotografía pendiente'));assert(x.s.calls.some(c=>c[0]==='topics'));});
 await test('Fallo guardando texto conserva título y contenido',async()=>{const g=gate(),x=await ready(setup({textGate:g}));button(x.h,'Pegar texto').props.onPress();x.h.render();find(x.h,'TextInput',n=>n.props.placeholder==='Por ejemplo, Energía y movimiento').props.onChangeText('Nuevo');find(x.h,'TextInput',n=>n.props.accessibilityLabel==='Contenido del material').props.onChangeText('Apuntes para estudiar');x.h.render();const work=button(x.h,'Guardar y descubrir temas').props.onPress();x.h.render();assert.equal(button(x.h,'Guardar y descubrir temas').props.disabled,true);g.reject(Error('Sin conexión'));await work;x.h.render();assert.equal(find(x.h,'TextInput',n=>n.props.placeholder==='Por ejemplo, Energía y movimiento').props.value,'Nuevo');assert.equal(find(x.h,'TextInput',n=>!!n.props.multiline).props.value,'Apuntes para estudiar');});
 await test('Pendientes sin proceso no consultan cada cuatro segundos',async()=>{const x=await ready(setup({rows:[{id:'m1',title:'Pendiente',file_type:'text',status:'pending',topics:[],created_at:'2026-10-20'}]}));assert.equal(x.s.intervals.length,0);detail(x);assert(button(x.h,'Analizar material'));});
 await test('Polling de un proceso está limitado a dos minutos',async()=>{const x=await ready(setup({rows:[{id:'m1',title:'En proceso',file_type:'text',status:'processing',topics:[],created_at:'2026-10-20'}]}));assert.equal(x.s.intervals.length,1);for(let i=0;i<30;i++)x.s.intervals[0].fn();assert.equal(x.s.intervals[0].cleared,true);await tick();x.h.unmount();assert.equal(x.h.late,0);});
 await test('Edición que termina después de desmontar no muestra alertas',async()=>{const g=gate(),x=await ready(setup({editGate:g}));detail(x);button(x.h,'Editar apunte').props.onPress();x.h.render();const work=button(x.h,'Guardar y analizar').props.onPress();x.h.unmount();g.resolve();await work;assert.equal(x.s.alerts.length,0);assert.equal(x.h.late,0);});
 fs.writeFileSync(__dirname+'/ui-report.json',JSON.stringify({scenarios:results.length,results},null,2));console.log(`${results.length} escenarios de interfaz aprobados con hooks y servicios simulados.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
