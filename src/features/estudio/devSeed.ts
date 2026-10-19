// SOLO PARA PRUEBAS. Borrar este archivo (y el botón en repaso.tsx) antes del Pull Request.
// Crea un material de prueba y 4 flashcards para el usuario con sesión.
import { supabase } from '../../services/supabase';

export async function seedTestFlashcards(): Promise<void> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('No hay sesión iniciada');
  const userId = auth.user.id;

  const { data: material, error: materialError } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      title: 'Material de prueba (Kevin)',
      file_type: 'text',
      raw_text: 'Material de prueba para flashcards',
      status: 'ready',
    })
    .select('id')
    .single();
  if (materialError) throw new Error('No se pudo crear el material: ' + materialError.message);

  const cards = [
    { front: '¿Qué es el discriminante?', back: 'b² − 4ac: dice cuántas soluciones reales tiene la ecuación.' },
    { front: '¿Qué forma tiene una ecuación cuadrática?', back: 'ax² + bx + c = 0, con a distinto de 0.' },
    { front: 'Si el discriminante es negativo…', back: 'No hay soluciones reales.' },
    { front: 'Soluciones de x² − 5x + 6 = 0', back: 'x = 3 y x = 2.' },
  ].map((c) => ({ ...c, user_id: userId, material_id: material.id, difficulty: 2 }));

  const { error } = await supabase.from('flashcards').insert(cards);
  if (error) throw new Error('No se pudieron crear las tarjetas: ' + error.message);
}
