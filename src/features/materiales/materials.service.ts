import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { runAi } from '../../services/ai';
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
  if ((file.size ?? 0) > 10 * 1024 * 1024) {
    throw new Error('El archivo supera los 10 MB');
  }

  const bytes = await fetch(file.uri).then((r) => r.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const up = await supabase.storage.from('materials').upload(path, bytes, {
    contentType: 'application/pdf',
  });

  if (up.error) throw new Error(`Error en storage: ${up.error.message}`);

  const { data, error } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      title: file.name,
      file_path: path,
      file_type: 'pdf',
      subject_id: subjectId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error en base de datos: ${error.message}`);

  return data.id as string;
}

/**
 * 2. Subir imagen (cámara o galería)
 */
export async function uploadImage(
  userId: string,
  source: 'camera' | 'library',
  subjectId?: string
): Promise<string | null> {
  let result: ImagePicker.ImagePickerResult;

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Se requiere permiso para usar la cámara');
    }
    result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Se requiere permiso para acceder a la galería');
    }
    result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
    });
  }

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  const manipulated = await manipulateAsync(
    asset.uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  );

  const bytes = await fetch(manipulated.uri).then((r) => r.arrayBuffer());
  const safeName = `foto_${Date.now()}.jpg`;
  const path = `${userId}/${Date.now()}-${safeName}`;

  const up = await supabase.storage.from('materials').upload(path, bytes, {
    contentType: 'image/jpeg',
  });

  if (up.error) throw new Error(`Error en storage: ${up.error.message}`);

  const { data, error } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      title: safeName,
      file_path: path,
      file_type: 'image',
      subject_id: subjectId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Error en base de datos: ${error.message}`);

  return data.id as string;
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

  return data as MaterialItem[];
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

  const { error } = await supabase
    .from('materials')
    .update({
      title: title.trim(),
      raw_text: rawText.trim(),
      status: 'pending',
    })
    .eq('id', materialId);

  if (error) throw new Error(`Error al actualizar material: ${error.message}`);
}

/**
 * 6. Eliminar material (registro de base de datos y archivo de storage si aplica)
 */
export async function deleteMaterial(materialId: string, filePath?: string | null): Promise<void> {
  if (filePath) {
    await supabase.storage.from('materials').remove([filePath]).catch(() => {});
  }

  const { error } = await supabase.from('materials').delete().eq('id', materialId);
  if (error) throw new Error(`Error al eliminar material: ${error.message}`);
}

/**
 * 7. Procesar temas con la IA
 */
export async function processMaterialTopics(materialId: string) {
  return await runAi('topics', materialId);
}