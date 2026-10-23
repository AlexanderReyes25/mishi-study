import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { PantallaCarga } from '../../components/PantallaCarga';
import { prepararLeccionMaterial } from './prepararLeccionMaterial';
import type { ModoImagen } from '../../services/PrepararImagen';
import { Alert, Text, TextInput } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BusyLine, ChoiceTile, Notice, SectionHeading, Sheet, Tag, ui } from '../../components/MishiUI';
import { BibliotecaView, MaterialStatus } from './BibliotecaView';
import {
  type MaterialItem,
  hasPendingImage,
  retryPendingImage,
  discardPendingImage,
  deleteMaterial,
  getMaterialsList,
  processMaterialTopics,
  updateRawText,
  uploadImage,
  uploadPdf,
  uploadRawText,
} from './materials.service';
import { colors } from '../../theme';

type FilterType = 'all' | 'pdf' | 'image' | 'text' | 'ready';

export function MaterialesScreen({ userId }: { userId: string }) {
  const mounted = useRef(false);
  const focused = useRef(false);
  const operation = useRef(false);
  const request = useRef(0);
  const showLoading = useRef(false);
  const [search, setSearch] = useState('');
  const [uploadVisible, setUploadVisible] = useState(false);
  const [imageMode, setImageMode] = useState<ModoImagen>('normal');
  const [pendingImage, setPendingImage] = useState(hasPendingImage(userId));
  const [preparing, setPreparing] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [readyLesson, setReadyLesson] = useState<{ materialId: string; topic: string } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Modal para apunte de texto nuevo
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [rawText, setRawText] = useState('');

  // Modal para ver / editar / eliminar material
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!mounted.current) return;
    const ticket = ++request.current;
    try {
      if (!silent) setLoading(true);
      const data = await getMaterialsList(userId);
      if (!mounted.current || ticket !== request.current) return;
      setMaterials(data);
      setSelectedMaterial((current) => current ? data.find((item) => item.id === current.id) ?? null : null);
    } catch (err: any) {
      if (!mounted.current) return;
      if (!silent && mounted.current && ticket === request.current) {
        Alert.alert('Error', err.message || 'No se pudieron cargar los materiales');
      }
    } finally {
      if (mounted.current && ticket === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    setIsFocused(true);
    void loadData();
    return () => { focused.current = false; if (mounted.current) setIsFocused(false); };
  }, [loadData]));

  const processing = materials.some((m) => m.status === 'processing');
  useEffect(() => {
    if (!processing || !isFocused) return;
    let ticks = 0;
    const interval = setInterval(() => {
      void loadData(true);
      if (++ticks >= 30) clearInterval(interval);
    }, 4000);
    return () => clearInterval(interval);
  }, [processing, isFocused, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handlePostUpload = async (materialId: string | null) => {
    if (!materialId || !mounted.current) return;
    await loadData(true);
    if (!mounted.current) return;
    try {
      await processMaterialTopics(materialId);
      await loadData(true);
    } catch (e: any) {
      if (!mounted.current) return;
      Alert.alert(
        'Aviso de análisis',
        `El material se guardó. ${e.message || 'La IA no pudo extraer temas.'} Abre su detalle para reintentar el análisis.`
      );
      await loadData(true);
    }
  };

  const handleUploadPdf = async () => {
    if (operation.current) return;
    operation.current = true;
    try {
      setUploading(true);
      const id = await uploadPdf(userId);
      if (id && mounted.current) {
        Alert.alert('Éxito', 'Documento PDF subido correctamente.');
        await handlePostUpload(id);
      }
    } catch (err: any) {
      if (!mounted.current) return;
      Alert.alert('Error al subir PDF', err.message);
    } finally {
      operation.current = false;
      if (mounted.current) { setUploading(false); setPendingImage(hasPendingImage(userId)); }
    }
  };

  const handleUploadImage = async (source: 'camera' | 'library') => {
    if (operation.current) return;
    operation.current = true;
    try {
      setUploading(true);
      const id = await uploadImage(userId, source, imageMode);
      if (id && mounted.current) {
        Alert.alert('Éxito', 'Imagen subida correctamente.');
        await handlePostUpload(id);
      }
    } catch (err: any) {
      if (!mounted.current) return;
      Alert.alert('Error al subir imagen', err.message);
    } finally {
      operation.current = false;
      if (mounted.current) { setUploading(false); setPendingImage(hasPendingImage(userId)); }
    }
  };

  const wordCount = useMemo(() => {
    const clean = rawText.trim();
    return clean ? clean.split(/\s+/).length : 0;
  }, [rawText]);

  const handleUploadText = async () => {
    if (operation.current) return;
    if (!textTitle.trim()) {
      Alert.alert('Falta título', 'Por favor ingresa un título para el material.');
      return;
    }
    if (!rawText.trim()) {
      Alert.alert('Texto vacío', 'Por favor ingresa el contenido de tus notas.');
      return;
    }

    operation.current = true;
    try {
      setUploading(true);
      const id = await uploadRawText(userId, textTitle, rawText);
      if (!mounted.current) return;
      setTextModalVisible(false);
      setTextTitle('');
      setRawText('');
      Alert.alert('Éxito', 'Apunte de texto guardado.');
      await handlePostUpload(id);
    } catch (err: any) {
      if (!mounted.current) return;
      Alert.alert('Error al guardar texto', err.message);
    } finally {
      operation.current = false;
      if (mounted.current) { setUploading(false); setPendingImage(hasPendingImage(userId)); }
    }
  };

  const openDetail = (item: MaterialItem) => {
    if (operation.current) return;
    setSelectedMaterial(item);
    setEditTitle(item.title);
    setEditText(item.raw_text ?? '');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedMaterial || operation.current) return;
    operation.current = true;
    try {
      setActionLoading(true);
      await updateRawText(selectedMaterial.id, editTitle, editText);
      if (!mounted.current) return;
      Alert.alert('Actualizado', 'Material actualizado. Se volverá a procesar con la IA.');
      const matId = selectedMaterial.id;
      setSelectedMaterial(null);
      await handlePostUpload(matId);
    } catch (err: any) {
      if (!mounted.current) return;
      Alert.alert('Error', err.message);
    } finally {
      operation.current = false;
      if (mounted.current) setActionLoading(false);
    }
  };

  const handleRetryAi = async () => {
    if (!selectedMaterial || operation.current) return;
    operation.current = true;
    try {
      setActionLoading(true);
      await processMaterialTopics(selectedMaterial.id);
      if (!mounted.current) return;
      Alert.alert('Éxito', 'Temas detectados correctamente.');
      setSelectedMaterial(null);
      await loadData(true);
    } catch (err: any) {
      if (!mounted.current) return;
      Alert.alert('Aviso', err.message || 'No se pudieron extraer temas.');
    } finally {
      operation.current = false;
      if (mounted.current) setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedMaterial || operation.current) return;
    Alert.alert(
      'Eliminar material',
      `¿Eliminar "${selectedMaterial.title}"? También se borrarán sus tarjetas y resúmenes. Las lecciones y exámenes quedarán en el historial sin el material original.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (operation.current || !mounted.current) return;
            operation.current = true;
            try {
              setActionLoading(true);
              const warning = await deleteMaterial(selectedMaterial.id);
              if (!mounted.current) return;
              setSelectedMaterial(null);
              await loadData(true);
              if (!mounted.current) return;
              Alert.alert(warning ? 'Aviso' : 'Eliminado', warning ?? 'El material se eliminó.');
            } catch (err: any) {
              if (!mounted.current) return;
              Alert.alert('Error al eliminar', err.message);
            } finally {
              operation.current = false;
              if (mounted.current) setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredMaterials = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return materials.filter((item) => {
      if (term && ![item.title, ...(item.topics ?? [])].join(' ').toLocaleLowerCase().includes(term)) return false;
      if (activeFilter === 'image') return item.file_type === 'image';
      if (activeFilter === 'pdf') return item.file_type === 'pdf';
      if (activeFilter === 'text') return item.file_type === 'text';
      if (activeFilter === 'ready') return item.status === 'ready';
      return true;
    });
  }, [materials, activeFilter, search]);

  const busy = uploading || actionLoading || preparing;

  const handleRetryPhoto = async () => {
    if (operation.current) return;
    operation.current = true;
    setUploading(true);
    try {
      const id = await retryPendingImage(userId);
      if (mounted.current) await handlePostUpload(id);
    } catch (error) {
      if (mounted.current) Alert.alert('Subida pendiente', error instanceof Error ? error.message : 'No se confirmó la subida.');
    } finally {
      operation.current = false;
      if (mounted.current) { setUploading(false); setPendingImage(hasPendingImage(userId)); }
    }
  };

  const handlePrepareLesson = async (topic: string) => {
    if (!selectedMaterial || operation.current) return;
    operation.current = true;
    const target = { materialId: selectedMaterial.id, topic };
    setSelectedMaterial(null);
    setReadyLesson(null);
    setPreparing(true);
    setShowLoadingScreen(true);
    showLoading.current = true;
    try {
      await prepararLeccionMaterial(userId, target.materialId, topic);
      if (!mounted.current) return;
      setReadyLesson(target);
      if (showLoading.current && focused.current) router.push({ pathname: '/estudio/leccion', params: target });
    } catch (error) {
      if (mounted.current) Alert.alert('Preparar lección', error instanceof Error ? error.message : 'No se pudo preparar.');
    } finally {
      operation.current = false;
      showLoading.current = false;
      if (mounted.current) { setPreparing(false); setShowLoadingScreen(false); void loadData(true); }
    }
  };

  return <>
    <BibliotecaView materials={filteredMaterials} total={materials.length} loading={loading || refreshing} busy={busy}
      filter={activeFilter} onFilter={setActiveFilter} search={search} onSearch={setSearch} onOpen={openDetail}
      onAdd={() => setUploadVisible(true)} onRefresh={onRefresh}>
      {preparing ? <BusyLine text="Mishi está preparando tu lección. Puedes volver a Inicio mientras termina." /> : null}
      {readyLesson && !preparing ? <Card><Tag label="Tu lección está lista" tone="success"/><Text style={ui.sectionTitle}>{readyLesson.topic}</Text><Button label="Abrir lección" icon="book-outline" onPress={() => router.push({ pathname: '/estudio/leccion', params: readyLesson })} /></Card> : null}
      {uploading ? <BusyLine text="Guardando tu material y descubriendo sus temas…" /> : null}
      {pendingImage ? <Card><Notice text="Tu fotografía sigue pendiente. Reintenta la misma subida para evitar duplicarla."/><Button label="Reintentar fotografía pendiente" disabled={busy} onPress={handleRetryPhoto}/><Button label="Descartar copia pendiente" disabled={busy} variant="secondary" onPress={() => {
        Alert.alert('Descartar copia local', 'No se elimina ningún material guardado. Actualiza la lista antes de volver a subir la foto.', [{text:'Cancelar',style:'cancel'},{text:'Descartar',onPress:()=>{discardPendingImage(userId);setPendingImage(false);void loadData();}}]);
      }}/></Card> : null}
    </BibliotecaView>
    {preparing && showLoadingScreen ? <PantallaCarga onClose={() => { showLoading.current=false;setShowLoadingScreen(false);router.navigate('/(tabs)'); }}/> : null}
    <Sheet visible={uploadVisible} title="¿Qué quieres estudiar?" subtitle="Elige de dónde vienen tus apuntes. Mishi encontrará los temas por ti." busy={busy} onClose={()=>setUploadVisible(false)}>
      <ChoiceTile icon="camera-outline" title="Tomar una foto" description="Captura tu cuaderno o una pizarra" disabled={busy || pendingImage} onPress={()=>{setUploadVisible(false);void handleUploadImage('camera');}}/>
      <ChoiceTile icon="images-outline" title="Elegir de la galería" description="Usa una fotografía que ya tengas" disabled={busy || pendingImage} onPress={()=>{setUploadVisible(false);void handleUploadImage('library');}}/>
      <ChoiceTile icon="document-text-outline" title="Subir un PDF" description="Guías y documentos de hasta 10 MB" disabled={busy} onPress={()=>{setUploadVisible(false);void handleUploadPdf();}}/>
      <ChoiceTile icon="create-outline" title="Pegar texto" description="Tus notas, un resumen o un temario" disabled={busy} onPress={()=>{setUploadVisible(false);setTextModalVisible(true);}}/>
      <Button variant="secondary" disabled={busy || pendingImage} label={imageMode==='normal'?'Fotos: calidad normal':'Fotos: más detalle'} icon="options-outline" onPress={()=>setImageMode(imageMode==='normal'?'detalle':'normal')}/>
      <Text style={ui.caption}>Usa más detalle si tus fotos contienen fórmulas o letra pequeña.</Text>
    </Sheet>
    <Sheet visible={textModalVisible} title="Un nuevo apunte" subtitle="Escribe o pega el material que quieres convertir en una lección." busy={busy} onClose={()=>setTextModalVisible(false)}>
      <Text style={ui.label}>Título</Text><TextInput accessibilityLabel="Título del material" placeholder="Por ejemplo, Energía y movimiento" placeholderTextColor={colors.textMuted} style={ui.field} value={textTitle} onChangeText={setTextTitle} editable={!busy}/>
      <SectionHeading title="Tus apuntes" detail={`${wordCount} palabras`}/><TextInput accessibilityLabel="Contenido del material" placeholder="Pega aquí tus notas…" placeholderTextColor={colors.textMuted} style={[ui.field,{minHeight:200,textAlignVertical:'top'}]} value={rawText} onChangeText={setRawText} multiline editable={!busy}/>
      <Button label="Guardar y descubrir temas" icon="sparkles-outline" onPress={handleUploadText} loading={uploading} disabled={busy}/>
    </Sheet>
    <Sheet visible={!!selectedMaterial} title={isEditing?'Editar apunte':'Dentro de tu material'} busy={busy} onClose={()=>setSelectedMaterial(null)}>
      {selectedMaterial ? isEditing ? <>
        <Text style={ui.label}>Título</Text><TextInput style={ui.field} accessibilityLabel="Editar título" value={editTitle} onChangeText={setEditTitle} editable={!busy}/>
        <Text style={ui.label}>Contenido</Text><TextInput style={[ui.field,{minHeight:220,textAlignVertical:'top'}]} accessibilityLabel="Editar contenido" value={editText} onChangeText={setEditText} multiline editable={!busy}/>
        <Button label="Guardar y analizar" onPress={handleSaveEdit} loading={actionLoading}/><Button label="Cancelar edición" variant="secondary" disabled={busy} onPress={()=>setIsEditing(false)}/>
      </> : <>
        <MaterialStatus status={selectedMaterial.status}/><Text style={[ui.sectionTitle,{fontSize:24}]}>{selectedMaterial.title}</Text>
        <Text style={ui.body}>Elige un tema y estudia a tu ritmo. Podrás volver por los demás.</Text>
        {selectedMaterial.topics?.length ? selectedMaterial.topics.map((topic,index)=><ChoiceTile key={topic+index} icon="book-outline" title={topic} description="Preparar o abrir tu lección" disabled={busy || selectedMaterial.status==='processing'} onPress={()=>handlePrepareLesson(topic)}/>) : <Notice text="Todavía no hay temas disponibles. Pulsa Analizar material para buscarlos."/>}
        {selectedMaterial.raw_text ? <Card><Text style={ui.label}>Tus apuntes originales</Text><Text selectable style={ui.body}>{selectedMaterial.raw_text}</Text></Card> : null}
        <ChoiceTile icon="clipboard-outline" title="Examen diagnóstico" description="Comprueba los temas de este material y descubre qué reforzar" disabled={busy || selectedMaterial.status==='processing'} onPress={()=>{const params={materialId:selectedMaterial.id,title:selectedMaterial.title};setSelectedMaterial(null);router.push({pathname:'/examen/diagnostico',params});}}/>
        <SectionHeading title="Gestionar material"/>
        {selectedMaterial.status!=='processing'?<Button label="Analizar material" icon="refresh-outline" variant="secondary" onPress={handleRetryAi} loading={actionLoading} disabled={busy}/>:null}
        {selectedMaterial.file_type==='text'?<Button label="Editar apunte" icon="create-outline" variant="secondary" disabled={busy} onPress={()=>setIsEditing(true)}/>:null}
        <Button label="Eliminar material" icon="trash-outline" variant="danger" disabled={busy || selectedMaterial.status==='processing'} onPress={handleDelete}/>
      </> : null}
    </Sheet>
  </>;
}
