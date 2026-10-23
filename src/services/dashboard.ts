import { supabase } from './supabase';

export type ProgressTopic = {
  id: string;
  topic: string;
  mastery: number;
  status: 'pending' | 'reinforcing' | 'approved';
  attempts: number;
  correct: number;
  last_evaluated_at?: string | null;
  subjects?: { name: string } | null;
};
export type Dashboard = { materials: number; lessons: number; cards: number; topics: ProgressTopic[] };

export async function getDashboard(userId: string, signal?: AbortSignal): Promise<Dashboard> {
  if (!userId) throw new Error('Inicia sesión para consultar tu progreso.');
  const counts = await Promise.all(['materials', 'lessons', 'flashcards'].map(table => {
    const query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId);
    return signal ? query.abortSignal(signal) : query;
  }));
  for (const result of counts) {
    if (result.error || result.count == null) throw new Error('No se pudo consultar tu actividad. Intenta de nuevo.');
  }

  // Leer todas las páginas evita presentar los últimos 50 temas como el total.
  const topics: ProgressTopic[] = [];
  let offset = 0;
  do {
    if (signal?.aborted) throw new Error('La consulta se interrumpió.');
    const query = supabase.from('topic_progress')
      .select('id,topic,mastery,status,attempts,correct,last_evaluated_at,subjects(name)', { count: 'exact' })
      .eq('user_id', userId).order('id', { ascending: true }).range(offset, offset + 249);
    const { data, error, count } = await (signal ? query.abortSignal(signal) : query);
    if (error || !data || count == null) throw new Error('No se pudieron consultar todos los temas evaluados. Intenta de nuevo.');
    if (!data.length && offset < count) throw new Error('La lista de temas cambió durante la consulta. Actualiza tu progreso.');
    topics.push(...data as unknown as ProgressTopic[]);
    offset += data.length;
    if (offset >= count) break;
  } while (true);

  return { materials: counts[0].count!, lessons: counts[1].count!, cards: counts[2].count!, topics };
}
