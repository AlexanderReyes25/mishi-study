// Formato de lección por bloques. Es el mismo que usa Suar en
// supabase/functions/_shared/lesson.ts (LessonBlock).
// TODO: cuando su rama se una a develop, borrar este tipo e importar LessonBlock desde allí.
export type LessonBlock =
  | { type: 'text'; content: string }
  | { type: 'formula'; latex: string }
  | { type: 'example'; title: string; steps: { text: string; latex?: string }[] }
  | { type: 'tip'; content: string };
