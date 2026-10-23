import { runAi } from '../../services/ai';
import { cargarLeccion } from '../../services/estudioIntegracion';
import { supabase } from '../../services/supabase';

const inFlight = new Map<string, Promise<void>>();

async function hasLesson(userId: string, materialId: string, topic: string) {
  const { data, error } = await supabase.from('lessons').select('id')
    .eq('user_id', userId).eq('material_id', materialId).eq('topic', topic)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('No se pudo comprobar si la lección ya está guardada.');
  if (!data) return false;
  // La fila debe contener una lección que la pantalla de Kevin pueda leer.
  await cargarLeccion(userId, materialId, topic);
  return true;
}

export function prepararLeccionMaterial(userId: string, materialId: string, topic: string): Promise<void> {
  const key = JSON.stringify([userId, materialId, topic]);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const task = prepare(userId, materialId, topic).finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

async function prepare(userId: string, materialId: string, topic: string) {
  if (!userId || !materialId || !topic.trim()) throw new Error('Selecciona un material y un tema.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || auth.user?.id !== userId) throw new Error('La sesión cambió. Vuelve a abrir Materiales.');
  const { data: material, error } = await supabase.from('materials').select('id,topics,status')
    .eq('user_id', userId).eq('id', materialId).single();
  if (error || !material) throw new Error('El material ya no está disponible. Actualiza la lista.');
  if (!Array.isArray(material.topics) || !material.topics.includes(topic)) {
    throw new Error('El tema cambió. Actualiza el material y selecciona uno de sus temas actuales.');
  }
  if (material.status === 'processing') throw new Error('El material aún se está procesando. Espera un momento.');
  if (await hasLesson(userId, materialId, topic)) return;
  try {
    await runAi('lesson', materialId, { topic });
  } catch (reason) {
    // Si solo se perdió la respuesta, abrir la fila confirmada sin generar otra.
    if (await hasLesson(userId, materialId, topic)) return;
    throw reason;
  }
  if (!(await hasLesson(userId, materialId, topic))) {
    throw new Error('No se confirmó el guardado de la lección. Puedes reintentar desde este tema.');
  }
}
