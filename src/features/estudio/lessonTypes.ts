// Formato de lección por bloques (Suar lo entrega en la versión 3 del servidor).
export type LessonBlock =
  | { type: 'text'; content: string }
  | { type: 'formula'; latex: string }
  | { type: 'example'; title: string; steps: { text: string; latex?: string }[] }
  | { type: 'tip'; content: string };
