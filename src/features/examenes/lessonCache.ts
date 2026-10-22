// Lecciones de refuerzo guardadas en memoria para no pedirlas dos veces a la IA
// (límite de 15 solicitudes por minuto). Se guarda la promesa, así dos pantallas
// o el doble efecto de desarrollo comparten una sola solicitud.
import { fetchLesson, type LessonResult } from '../../services/exams';

const cache = new Map<string, Promise<LessonResult>>();

const keyOf = (materialId: string, topic: string) => `${materialId}::${topic}`;

export function getLesson(materialId: string, topic: string): Promise<LessonResult> {
  const key = keyOf(materialId, topic);
  const cached = cache.get(key);
  if (cached) return cached;

  const request = fetchLesson(materialId, topic);
  cache.set(key, request);
  // Si falla, se olvida para que "Reintentar" haga una solicitud nueva
  request.catch(() => {
    if (cache.get(key) === request) cache.delete(key);
  });
  return request;
}

// Al terminar un examen nuevo de esos temas, la próxima lección debe ser otra
export function forgetLessons(materialId: string, topics: string[]): void {
  for (const topic of topics) cache.delete(keyOf(materialId, topic));
}
