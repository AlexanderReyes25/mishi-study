import { Image } from 'expo-image';
import { Text, TextInput, View } from 'react-native';
import { MAX_EXERCISE, MAX_PROCEDURE, type ReviewResult } from '../../../supabase/functions/_shared/review';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BusyLine, Notice, Page, SectionHeading, Tag, ui } from '../../components/MishiUI';
import type { ModoImagen } from '../../services/PrepararImagen';
import { colors, spacing } from '../../theme';
import { ReviewResultView } from './ReviewResultView';
type Props={exercise:string;procedure:string;photo:string;quality:ModoImagen;confirmed:boolean;uncertain:string[];busy:string;error:string;result:ReviewResult|null;disabled:boolean;onExercise:(s:string)=>void;onProcedure:(s:string)=>void;onPhoto:(s:'camera'|'gallery')=>void;onQuality:()=>void;onConfirm:()=>void;onTextOnly:()=>void;onReview:()=>void};
export function PracticaView(p:Props){
 return <Page inStack eyebrow="MISHI / PRÁCTICA LIBRE" title="Muéstrame tus pasos" subtitle="El resultado importa. Entender cómo llegaste también.">
   <Card><View style={ui.headingRow}><Tag label="01 / EL EJERCICIO" tone="coral"/><Text style={ui.caption}>{p.exercise.length}/{MAX_EXERCISE}</Text></View><Text style={ui.sectionTitle}>¿Qué estás resolviendo?</Text><TextInput style={[ui.field,{minHeight:110,textAlignVertical:'top'}]} accessibilityLabel="Enunciado del ejercicio" placeholder="Escribe el enunciado y sus datos…" placeholderTextColor={colors.textMuted} value={p.exercise} onChangeText={p.onExercise} multiline maxLength={MAX_EXERCISE} editable={!p.disabled}/></Card>
   <Card><Tag label="02 / TU PROCEDIMIENTO" tone="coral"/><Text style={ui.sectionTitle}>Cada paso tiene algo que contar</Text><Text style={ui.body}>Escribe tu solución o lee una fotografía de tu trabajo.</Text>
     <View style={[ui.row,{flexWrap:'wrap'}]}><View style={{flex:1,minWidth:120}}><Button label="Leer foto" icon="images-outline" variant="secondary" disabled={p.disabled} onPress={()=>p.onPhoto('gallery')}/></View><View style={{flex:1,minWidth:120}}><Button label="Usar cámara" icon="camera-outline" variant="secondary" disabled={p.disabled} onPress={()=>p.onPhoto('camera')}/></View></View>
     <Button label={p.quality==='detalle'?'Fotos con más detalle':'Fotos en calidad normal'} icon="options-outline" variant="secondary" disabled={p.disabled} onPress={p.onQuality}/>
     <Text style={ui.caption}>Al elegir una foto, se envía una copia optimizada a la IA. Su lectura reemplaza el texto de abajo cuando termina.</Text>
     {p.photo?<><Image source={{uri:p.photo}} contentFit="contain" style={{width:'100%',height:240,borderRadius:16,backgroundColor:colors.surface}} accessibilityLabel="Fotografía de tu procedimiento"/><Notice text="Compara la transcripción con tu foto y corrige cualquier signo o cifra antes de confirmar."/>{p.uncertain.map((d,i)=><Notice key={i} text={d}/>)}<Button label="Continuar solo con texto" variant="secondary" disabled={p.disabled} onPress={p.onTextOnly}/></>:null}
     <TextInput style={[ui.field,{minHeight:200,textAlignVertical:'top'}]} accessibilityLabel="Procedimiento del estudiante" placeholder={'1. Parto de…\n2. Después…\n3. Mi resultado es…'} placeholderTextColor={colors.textMuted} multiline value={p.procedure} onChangeText={p.onProcedure} maxLength={MAX_PROCEDURE} editable={!p.disabled}/>
     <Text style={ui.caption}>{p.procedure.length}/{MAX_PROCEDURE} caracteres</Text>
     {p.photo?<Button label={p.confirmed?'Lectura confirmada':'El texto coincide con mi trabajo'} icon={p.confirmed?'checkmark-circle-outline':'checkmark-outline'} variant={p.confirmed?'success':'secondary'} disabled={p.disabled||!p.procedure.trim()||/\[ilegible\]/i.test(p.procedure)} onPress={p.onConfirm}/>:null}
     <Button label="Revisar mi procedimiento" icon="sparkles-outline" onPress={p.onReview} disabled={p.disabled||!p.exercise.trim()||!p.procedure.trim()||(!!p.photo&&!p.confirmed)}/>
   </Card>
   {p.busy?<BusyLine text={p.busy}/>:null}{p.error?<Notice error text={p.error}/>:null}
   {p.result?<><SectionHeading title="Una pista para seguir"/><ReviewResultView result={p.result}/></>:<View style={{padding:spacing.sm}}><Text style={ui.caption}>Práctica orientativa: Mishi revisa tus pasos y tu resultado por separado. Esta actividad no guarda una nota.</Text></View>}
 </Page>;
}
