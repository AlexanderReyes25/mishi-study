import { supabase } from './supabase';

// Columnas reales de la tabla flashcards (supabase/migrations/001_schema.sql)
export type Flashcard = {
  id: string;
  user_id: string;
  material_id: string;
  front: string;
  back: string;
  difficulty: number;
  interval_days: number;
  next_review_at: string;
  times_correct: number;
  times_wrong: number;
  created_at: string;
};

// Tarjetas vencidas: next_review_at <= ahora. RLS ya limita a las del usuario con sesión.
export async function getDueFlashcards(materialId?: string, limit = 30): Promise<Flashcard[]> {
  let q = supabase
    .from('flashcards')
    .select('*')
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit);
  if (materialId) q = q.eq('material_id', materialId);
  const { data, error } = await q;
  if (error) throw new Error('No se pudieron cargar las tarjetas: ' + error.message);
  return (data ?? []) as Flashcard[];
}

// Cuántas tarjetas hay por repasar (para mostrarlo en la pestaña Repaso).
export async function getDueCount(): Promise<number> {
  const { count, error } = await supabase
    .from('flashcards')
    .select('id', { count: 'exact', head: true })
    .lte('next_review_at', new Date().toISOString());
  if (error) throw new Error('No se pudo contar las tarjetas: ' + error.message);
  return count ?? 0;
}

// Sabía: duplica el intervalo (mínimo 1 día). No sabía: intervalo 0 para repetir hoy.
export async function reviewFlashcard(card: Flashcard, knew: boolean): Promise<Flashcard> {
  const next = knew ? Math.max(1, card.interval_days * 2) : 0;
  const updated = {
    interval_days: next,
    next_review_at: new Date(Date.now() + next * 86400000).toISOString(),
    times_correct: card.times_correct + (knew ? 1 : 0),
    times_wrong: card.times_wrong + (knew ? 0 : 1),
  };
  const { error } = await supabase.from('flashcards').update(updated).eq('id', card.id);
  if (error) throw new Error('No se pudo guardar tu respuesta: ' + error.message);
  return { ...card, ...updated };
}
