import { Text, View } from 'react-native';
import { MathText, RichText } from '../../components/MathText';
import { IconTile, Tag, ui } from '../../components/MishiUI';
import type { LessonBlock } from './lessonTypes';
import { colors, radius, spacing } from '../../theme';
export function LessonView({blocks}:{blocks:LessonBlock[]}){return <View style={{gap:spacing.xl}}>{blocks.map((b,i)=>{
 if(b.type==='text')return <RichText key={i} text={b.content}/>;
 if(b.type==='formula')return <View key={i} style={{backgroundColor:colors.surface,borderRadius:radius.md,padding:spacing.md}}><MathText text={'$$'+b.latex+'$$'}/></View>;
 if(b.type==='tip')return <View key={i} style={{backgroundColor:colors.successSoft,borderRadius:radius.md,padding:spacing.lg,gap:spacing.md}}><View style={ui.headingRow}><IconTile small icon="bulb-outline" tone="lime"/><Text style={[ui.label,{flex:1}]}>Quédate con esta idea</Text></View><RichText text={b.content}/></View>;
 return <View key={i} style={{gap:spacing.lg,borderTopWidth:1,borderTopColor:colors.line,paddingTop:spacing.lg}}><Tag label="VAMOS PASO A PASO" tone="coral"/><Text style={ui.sectionTitle}>{b.title}</Text>{b.steps.map((step,j)=><View key={j} style={{gap:spacing.sm}}><View style={{flexDirection:'row',gap:spacing.md}}><View style={{width:26,height:26,backgroundColor:colors.coralSoft,borderRadius:9,alignItems:'center',justifyContent:'center'}}><Text style={ui.caption}>{j+1}</Text></View><View style={{flex:1}}><RichText text={step.text.replace(/^\s*\d+[.)]\s+/,'')}/></View></View>{step.latex?<View style={{backgroundColor:colors.surface,padding:spacing.md,borderRadius:radius.md}}><MathText text={'$$'+step.latex+'$$'}/></View>:null}</View>)}</View>;
 })}</View>;}
