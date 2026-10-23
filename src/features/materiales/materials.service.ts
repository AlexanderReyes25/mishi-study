import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { uuid } from 'expo-modules-core';
import * as ImagePicker from 'expo-image-picker';
import { runAi } from '../../services/ai';
import { prepararImagen, type ImagenPreparada, type ModoImagen } from '../../services/PrepararImagen';
import { crearSubidaImagen, subirImagen, type SubidaImagen } from '../../services/subirImagen';
import { supabase } from '../../services/supabase';

export interface MaterialItem {
  id: string;
  title: string;
  file_type: 'pdf' | 'image' | 'text';
  status: 'pending' | 'processing' | 'ready' | 'error';
  topics: string[] | null;
  raw_text?: string | null;
  file_path?: string | null;
  created_at: string;
}

const MAX_BYTES = 10 * 1024 * 1024;
const pendingImages = new Map<string, { image: ImagenPreparada; upload: SubidaImagen }>();

async function currentUser(expectedId?: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Inicia sesión y comprueba tu conexión.');
  if (expectedId && data.user.id !== expectedId) throw new Error('La cuenta cambió. Vuelve a abrir Materiales.');
  return data.user.id;
}

export function hasPendingImage(userId: string) { return pendingImages.has(userId); }

export function discardPendingImage(userId: string) {
  const pending = pendingImages.get(userId);
  pending?.image.limpiar();
  pendingImages.delete(userId);
}

export async function retryPendingImage(userId: string): Promise<string> {
  const pending = pendingImages.get(userId);
  if (!pending) throw new Error('No hay una fotografía pendiente.');
  const id = await subirImagen(pending.upload);
  discardPendingImage(userId);
  return id;
}

/**
 * 1. Subir documento PDF
 */
export async function uploadPdf(userId: string, subjectId?: string): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (res.canceled) return null;

  const file = res.assets[0];
  if (!file) return null;
  if ((file.size ?? 0) > MAX_BYTES) {
    throw new Error('El archivo supera los 10 MB');
  }

  const local = new File(file.uri);
  if (!local.exists || local.size <= 0 || local.size > MAX_BYTES) {
    throw new Error('El PDF está vacío, no está disponible o supera los 10 MB.');
  }
  const bytes = await local.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES ||
      String.fromCharCode(...new Uint8Array(bytes).slice(0, 5)) !== '%PDF-') {
    throw new Error('Selecciona un PDF válido de hasta 10 MB.');
  }
  await currentUser(userId);
  const id = uuid.v4();
  const path = `${userId}/${id}.pdf`;

  const up = await supabase.storage.from('materials').upload(path, bytes, {
    contentType: 'application/pdf',
  });

  if (up.error) throw new Error(`Error en storage: ${up.error.message}`);

  await currentUser(userId);
  const { data, error } = await supabase
    .from('materials')
    .insert({
      id,
      user_id: userId,
      title: file.name,
      file_path: path,
      file_type: 'pdf',
      subject_id: subjectId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error('No se pudo confirmar el PDF. Actualiza la lista antes de volver a subirlo.');

  return data.id as string;
}

/**
 * 2. Subir imagen (cámara o galería)
 */
export async function uploadImage(
  userId: string,
  source: 'camera' | 'library',
  mode: ModoImagen = 'normal'
): Promise<string | null> {
  if (hasPendingImage(userId)) throw new Error('Reintenta la fotografía pendiente o descártala antes de elegir otra.');
  let result: ImagePicker.ImagePickerResult;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Se requiere permiso para usar la cámara');
    }
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 1, allowsEditing: false,
    });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 1, allowsEditing: false, allowsMultipleSelection: false,
    });
  }

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  await currentUser(userId);
  const image = await prepararImagen(asset.uri, mode);
  pendingImages.set(userId, { image, upload: crearSubidaImagen(userId, image) });
  return retryPendingImage(userId);
}

/**
 * 3. Subir texto plano
 */
export async function uploadRawText(
  userId: string,
  title: string,
  rawText: string,
  subjectId?: string
): Promise<string> {
  if (!title.trim()) throw new Error('Debes ingresar un título para el material');
  if (!rawText.trim()) throw new Error('El texto no puede estar vacío');
  await currentUser(userId);

  const { data, error } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      title: title.trim(),
      raw_text: rawText.trim(),
      file_type: 'text',
      subject_id: subjectId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error al guardar texto: ${error.message}`);

  return data.id as string;
}

/**
 * 4. Obtener la lista de materiales del usuario
 */
export async function getMaterialsList(userId: string): Promise<MaterialItem[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id, title, file_type, status, topics, raw_text, file_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error al consultar materiales: ${error.message}`);

  return (data ?? []) as MaterialItem[];
}

/**
 * 5. Actualizar apunte de texto existente
 */
export async function updateRawText(
  materialId: string,
  title: string,
  rawText: string
): Promise<void> {
  if (!title.trim()) throw new Error('Debes ingresar un título');
  if (!rawText.trim()) throw new Error('El texto no puede estar vacío');
  const userId = await currentUser();
  // El esquema todavía no versiona los apuntes. No mezclar una lección antigua con texto nuevo.
  for (const table of ['lessons', 'flashcards', 'summaries', 'exams']) {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('material_id', materialId);
    if (error || count == null) throw new Error('No se pudo comprobar el contenido asociado. Intenta de nuevo.');
    if (count > 0) throw new Error('Este material ya tiene contenido de estudio. Pega la versión corregida como un apunte nuevo para conservar las lecciones y el historial anteriores.');
  }
  const { error } = await supabase
    .from('materials')
    .update({
      title: title.trim(),
      raw_text: rawText.trim(),
      status: 'pending',
      topics: [],
    })
    .eq('id', materialId).eq('user_id', userId).eq('file_type', 'text').neq('status', 'processing')
    .select('id').single();

  if (error) throw new Error(`Error al actualizar material: ${error.message}`);
}

/**
 * 6. Eliminar material (registro de base de datos y archivo de storage si aplica)
 */
export async function deleteMaterial(materialId: string): Promise<string | null> {
  const userId = await currentUser();
  const { data: material, error: readError } = await supabase.from('materials')
    .select('id,file_path,status').eq('id', materialId).eq('user_id', userId).single();
  if (readError || !material) throw new Error('No se pudo comprobar el material. Actualiza la lista.');
  if (material.status === 'processing') throw new Error('Espera a que termine el análisis antes de eliminar.');
  const { error } = await supabase.from('materials').delete().eq('id', materialId)
    .eq('user_id', userId).neq('status', 'processing').select('id').single();
  if (error) throw new Error(`Error al eliminar material: ${error.message}`);
  if (material.file_path) {
    try {
      if (!material.file_path.startsWith(`${userId}/`)) throw new Error('Ruta inválida');
      const { error: storageError } = await supabase.storage.from('materials').remove([material.file_path]);
      if (storageError) throw storageError;
    } catch {
      return 'El registro se eliminó, pero no se pudo confirmar la limpieza del archivo en Storage.';
    }
  }
  return null;
}

/**
 * 7. Procesar temas con la IA
 */
export async function processMaterialTopics(materialId: string) {
  return await runAi('topics', materialId, { force: true });
}
