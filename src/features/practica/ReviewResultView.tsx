import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { ReviewResult } from '../../../supabase/functions/_shared/review';
import { Card } from '../../components/Card';
import { RichText } from '../../components/MathText';
import { Notice, Tag, ui } from '../../components/MishiUI';
import { colors, spacing } from '../../theme';
const labels={correct:'Tu procedimiento va bien',incorrect:'Hay un paso que podemos mejorar',incomplete:'Te falta completar algunos pasos',missing:'Muéstrale a Mishi cómo lo resolviste',unverifiable:'Necesitamos un poco más de información'};
export function ReviewResultView({result}:{result:ReviewResult}){
 return <View style={{gap:spacing.lg}}><Card><Tag label="LA REVISIÓN DE MISHI" tone="success"/><Text style={[ui.sectionTitle,{fontSize:22,lineHeight:29}]}>{labels[result.procedureStatus]}</Text><Text style={ui.caption}>Resultado final: {{correct:'correcto',incorrect:'por corregir',not_shown:'aún no aparece',unverifiable:'sin verificar'}[result.resultStatus]}</Text><RichText text={result.summary}/></Card>
 {result.steps.map((step,index)=><Card key={index}><View style={ui.headingRow}><Text style={ui.label}>Paso {String(index+1).padStart(2,'0')}</Text><Ionicons name={step.status==='correct'?'checkmark-circle':step.status==='incorrect'?'alert-circle':'help-circle-outline'} size={24} color={step.status==='correct'?colors.successDark:step.status==='incorrect'?colors.error:colors.textMuted}/></View><Text selectable style={{backgroundColor:colors.surface,padding:spacing.md,borderRadius:12,color:colors.primaryDark,fontSize:16,lineHeight:25}}>{step.quote}</Text><RichText text={step.feedback}/></Card>)}
 <Card><Tag label="TU SIGUIENTE PASO" tone="coral"/><RichText text={result.nextHint}/></Card>
 <Notice text="Esta revisión orientativa te ayuda a practicar. No guarda una nota ni modifica tu progreso."/>
 </View>;
}
