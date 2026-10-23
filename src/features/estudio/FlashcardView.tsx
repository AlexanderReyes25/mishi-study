import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { RichText } from '../../components/MathText';
import { BusyLine, EmptyState, IconTile, Notice, Page, Tag, ui } from '../../components/MishiUI';
import type { Flashcard } from '../../services/study';
import { colors, spacing } from '../../theme';
export function FlashcardView({card,remaining,reviewed,flipped,loading,saving,error,onFlip,onAnswer,onReload}: {card?:Flashcard;remaining:number;reviewed:number;flipped:boolean;loading:boolean;saving:boolean;error:string|null;onFlip:()=>void;onAnswer:(knew:boolean)=>void;onReload:()=>void}) {
 return <Page inStack eyebrow="MISHI / TARJETAS" title="Dale una vuelta" subtitle="Primero recuerda. Después descubre la respuesta.">
   {loading?<BusyLine text="Preparando tus tarjetas…"/>:!card?<EmptyState icon={error?'cloud-offline-outline':'checkmark-done-outline'} title={error?'No pudimos cargar el repaso':reviewed?'Completaste este bloque':'Todo al día por ahora'} description={error||'Busca si hay más tarjetas disponibles o regresa cuando toque tu siguiente repaso.'}><Button label="Buscar más tarjetas" icon="refresh-outline" onPress={onReload}/></EmptyState>:<>
   <View style={ui.headingRow}><Tag label={remaining+' en este bloque'} tone="coral"/><Text style={ui.caption}>{reviewed} respuestas revisadas</Text></View>
   <View style={{backgroundColor:flipped?colors.successSoft:colors.white,borderRadius:28,borderWidth:1,borderColor:colors.line,padding:spacing.xl,gap:spacing.xl,minHeight:280,justifyContent:'center'}}><View style={ui.headingRow}><Tag label={flipped?'LA RESPUESTA':'PARA PENSAR'} tone={flipped?'success':'neutral'}/><IconTile icon={flipped?'bulb-outline':'help-outline'} small tone={flipped?'lime':'coral'}/></View><RichText text={flipped?card.back:card.front}/><Text style={ui.caption}>{flipped?'Date un momento para comparar con lo que pensaste.':'Intenta responder antes de mirar el otro lado.'}</Text></View>
   {error?<Notice error text={error}/>:null}
   {!flipped?<Button label="Ver respuesta" icon="sync-outline" onPress={onFlip}/>:<><Text style={[ui.label,{textAlign:'center'}]}>¿Cómo te fue?</Text><View style={[ui.row,{flexWrap:'wrap'}]}><View style={{flex:1,minWidth:120}}><Button label="Quiero repetirla" variant="secondary" disabled={saving} onPress={()=>onAnswer(false)}/></View><View style={{flex:1,minWidth:120}}><Button label="Lo recordé" icon="checkmark" variant="success" disabled={saving} onPress={()=>onAnswer(true)}/></View></View><Button label="Volver a la pregunta" variant="secondary" disabled={saving} onPress={onFlip}/></>}
   {saving?<BusyLine text="Guardando tu respuesta…"/>:null}
   </>}
 </Page>;
}
