import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BusyLine, ChoiceTile, EmptyState, IconTile, Notice, Page, SectionHeading, Tag, ui } from '../../components/MishiUI';
import { colors, spacing } from '../../theme';
type LessonLink={id:string;title:string;topic:string;material_id:string|null};
export function RepasoView({due,lessons,error,onCards,onPractice,onLesson,onRefresh,onExams}: {due:number|null;lessons:LessonLink[];error?:string|null;onCards:()=>void;onPractice:()=>void;onLesson:(l:LessonLink)=>void;onRefresh:()=>void;onExams:()=>void}) {
 return <Page eyebrow="MISHI / REPASO" title="Un poco cada día" subtitle="Vuelve a lo importante. Lo que practicas, se queda contigo.">
   <View style={{backgroundColor:colors.successSoft,borderRadius:24,padding:spacing.xl,gap:spacing.lg}}><View style={ui.headingRow}><View style={{gap:6,flex:1}}><Tag label="TU SESIÓN DE HOY" tone="success"/><Text style={{fontSize:36,fontWeight:'800',color:colors.primaryDark}}>{due===null?'—':due} <Text style={{fontSize:18}}>tarjetas</Text></Text></View><IconTile icon="layers-outline" tone="lime"/></View><Text style={ui.body}>{due===0?'No tienes tarjetas pendientes ahora. Puedes practicar un ejercicio o volver a una lección.':'Un pequeño repaso para fortalecer lo que ya aprendiste.'}</Text><Button label="Comenzar repaso" icon="play-outline" onPress={onCards} disabled={due===null||due===0}/></View>
   {error?<><Notice error text={error}/><Button label="Volver a cargar" onPress={onRefresh} variant="secondary"/></>:due===null?<BusyLine text="Consultando tu repaso…"/>:null}
   <SectionHeading title="Comprueba lo aprendido"/><ChoiceTile icon="clipboard-outline" title="Mis exámenes" description="Responde, descubre qué reforzar y registra tu avance" onPress={onExams}/>
   <SectionHeading title="Piensa paso a paso"/><ChoiceTile icon="pencil-outline" title="Revisar mi procedimiento" description="Escribe tu solución o fotografía tu cuaderno" onPress={onPractice}/>
   <SectionHeading title="Vuelve a tus lecciones" detail="Las más recientes"/>
   {lessons.length?lessons.map(l=><Card key={l.id}><View style={ui.headingRow}><IconTile icon="book-outline" small/><Tag label={l.material_id?'Lección guardada':'Material eliminado'}/></View><Text style={ui.sectionTitle}>{l.title||l.topic}</Text><Text style={ui.caption}>{l.topic}</Text><Button label="Seguir estudiando" icon="arrow-forward" variant="secondary" disabled={!l.material_id} onPress={()=>onLesson(l)}/></Card>):due!==null&&!error?<EmptyState icon="book-outline" title="Tus lecciones te esperan aquí" description="Prepara una lección desde Materiales para volver a consultarla cuando quieras."/>:null}
 </Page>;
}
