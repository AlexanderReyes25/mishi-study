import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { BusyLine, EmptyState, IconButton, IconTile, Page, SectionHeading, Tag, ui } from '../../components/MishiUI';
import { colors, radius, spacing } from '../../theme';
import type { MaterialItem } from './materials.service';
export type MaterialFilter = 'all' | 'pdf' | 'image' | 'text' | 'ready';
export function MaterialStatus({ status }: { status: MaterialItem['status'] }) {
  return <Tag label={{ready:'Listo para estudiar',processing:'Analizando',pending:'Por analizar',error:'Revisar análisis'}[status]} tone={status==='ready'?'success':status==='error'?'error':'neutral'} />;
}
export function MaterialCard({ item, onPress, disabled }: { item: MaterialItem; onPress: () => void; disabled?: boolean }) {
  const icon = item.file_type==='pdf'?'document-text-outline':item.file_type==='image'?'image-outline':'reader-outline';
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={'Abrir material: '+item.title} style={({pressed})=>[styles.card,pressed&&{opacity:0.7}]}>
    <View style={ui.headingRow}><IconTile icon={icon} tone={item.file_type==='image'?'coral':'soft'} /><MaterialStatus status={item.status} /></View>
    <Text style={styles.title}>{item.title}</Text>
    <Text numberOfLines={2} style={ui.body}>{item.topics?.length ? item.topics.join(' · ') : item.raw_text || 'Un material para descubrir algo nuevo.'}</Text>
    <View style={styles.bottom}><Text style={ui.caption}>{item.file_type==='text'?'Apunte':item.file_type==='image'?'Fotografía':'PDF'} · {item.topics?.length??0} temas</Text><Ionicons name="arrow-forward" size={20} color={colors.primary} /></View>
  </Pressable>;
}
type Props={materials:MaterialItem[];total:number;loading?:boolean;busy?:boolean;filter:MaterialFilter;onFilter:(f:MaterialFilter)=>void;search:string;onSearch:(s:string)=>void;onOpen:(m:MaterialItem)=>void;onAdd:()=>void;onRefresh:()=>void;children?:ReactNode};
export function BibliotecaView({materials,total,loading,busy,filter,onFilter,search,onSearch,onOpen,onAdd,onRefresh,children}:Props){
 return <Page eyebrow="MISHI / BIBLIOTECA" title="Tus materiales" subtitle="Lo que quieres aprender, en un solo lugar." action={<IconButton icon="refresh-outline" label="Actualizar lista" light disabled={busy} onPress={onRefresh} />}>
   <View style={styles.addCard}><View style={ui.headingRow}><View style={{flex:1,gap:6}}><Text style={styles.addTitle}>Dale un nuevo tema a Mishi</Text><Text style={styles.addText}>Una foto, un PDF o tus propios apuntes.</Text></View><IconTile icon="sparkles-outline" tone="coral" /></View><Button label="Añadir material" icon="add" onPress={onAdd} disabled={busy} /></View>
   {children}
   <View style={styles.search}><Ionicons name="search-outline" size={21} color={colors.textMuted}/><TextInput accessibilityLabel="Buscar materiales" placeholder="Busca un título o un tema" placeholderTextColor={colors.textMuted} value={search} onChangeText={onSearch} style={styles.searchInput}/>{search?<IconButton label="Limpiar búsqueda" icon="close" onPress={()=>onSearch('')}/>:null}</View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{([{id:'all',label:'Todos'},{id:'image',label:'Fotos'},{id:'pdf',label:'PDF'},{id:'text',label:'Apuntes'},{id:'ready',label:'Listos'}] as const).map(tab=><Pressable key={tab.id} accessibilityRole="button" accessibilityState={{selected:filter===tab.id}} onPress={()=>onFilter(tab.id)} style={[styles.filter,filter===tab.id&&styles.activeFilter]}><Text style={[styles.filterText,filter===tab.id&&{color:colors.white}]}>{tab.label}</Text></Pressable>)}</ScrollView>
   <SectionHeading title="Tu biblioteca" detail={`${total} materiales`} />
   {loading?<BusyLine text="Buscando tus materiales…"/>:materials.length?materials.map(item=><MaterialCard key={item.id} item={item} onPress={()=>onOpen(item)} disabled={busy}/>):<EmptyState icon="folder-open-outline" title={search||filter!=='all'?'No encontramos coincidencias':'Tu próximo aprendizaje empieza aquí'} description={search||filter!=='all'?'Prueba otro título, tema o filtro.':'Añade tus primeros apuntes y Mishi te ayudará a convertirlos en una lección.'}/>}
 </Page>;
}
const styles=StyleSheet.create({
 addCard:{backgroundColor:colors.coralSoft,padding:spacing.lg,borderRadius:radius.lg,gap:spacing.lg},addTitle:{fontSize:18,fontWeight:'800',color:colors.primaryDark},addText:{fontSize:13,lineHeight:20,color:colors.text},
 search:{backgroundColor:colors.white,borderColor:colors.line,borderWidth:1,borderRadius:radius.md,paddingLeft:spacing.lg,paddingRight:spacing.sm,minHeight:54,flexDirection:'row',alignItems:'center',gap:spacing.sm},searchInput:{flex:1,minWidth:0,fontSize:15,color:colors.text,paddingVertical:spacing.md},
 filter:{borderRadius:radius.pill,paddingHorizontal:18,paddingVertical:13,backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,minHeight:46},activeFilter:{backgroundColor:colors.primary,borderColor:colors.primary},filterText:{fontSize:13,fontWeight:'600',color:colors.textMuted},
 card:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.line,borderRadius:radius.lg,padding:spacing.lg,gap:spacing.md},title:{fontSize:19,fontWeight:'700',color:colors.primaryDark,lineHeight:26},bottom:{borderTopWidth:1,borderColor:colors.line,paddingTop:spacing.md,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
});
