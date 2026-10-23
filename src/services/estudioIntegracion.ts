import { parseLesson, type LessonBlock } from '../../supabase/functions/_shared/lesson';
import { runAi } from './ai';
import { supabase } from './supabase';

export type LeccionGuardada = {
  id: string;
  material_id: string | null;
  topic: string;
  title: string;
  content: string;
  blocks: LessonBlock[] | null;
};

export async function listarLecciones(userId: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, material_id, topic, title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  return ((data ?? []) as Pick<LeccionGuardada, 'id' | 'material_id' | 'topic' | 'title'>[])
    .filter((lesson) => {
      const key = JSON.stringify([lesson.material_id, lesson.topic]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function cargarLeccion(userId: string, materialId: string, topic: string): Promise<LeccionGuardada> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, material_id, topic, title, content, blocks')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .eq('topic', topic)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Esta lección no está guardada o ya no está disponible.');
  // Las lecciones antiguas pueden tener solo Markdown.
  if (data.blocks != null) {
    const parsed = parseLesson(data);
    return { ...data, ...parsed } as LeccionGuardada;
  }
  if (typeof data.content !== 'string' || !data.content.trim()) {
    throw new Error('La lección guardada no tiene contenido.');
  }
  return { ...data, title: data.title || data.topic, blocks: null } as LeccionGuardada;
}

async function contarTarjetas(userId: string, materialId: string) {
  const { count, error } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('material_id', materialId);
  if (error) throw new Error(error.message);
  if (count == null) throw new Error('No se pudo comprobar si ya existen tarjetas.');
  return count;
}

export async function prepararTarjetas(userId: string, materialId: string) {
  // Contamos todas, incluidas las programadas para otro día, para reutilizarlas.
  if (await contarTarjetas(userId, materialId)) return;
  try {
    await runAi('flashcards', materialId, { count: 8 });
  } catch (error) {
    // La escritura puede haber terminado aunque se haya perdido su respuesta.
    if (await contarTarjetas(userId, materialId)) return;
    throw error;
  }
  if (!(await contarTarjetas(userId, materialId))) {
    throw new Error('La IA no guardó tarjetas. Puedes volver a intentarlo.');
  }
}
