// Lecciones de refuerzo guardadas en memoria para no pedirlas dos veces a la IA
// (límite de 15 solicitudes por minuto). Se guarda la promesa, así dos pantallas
// o el doble efecto de desarrollo comparten una sola solicitud.
import { fetchLesson, type LessonResult } from '../../services/exams';

const cache = new Map<string, Promise<LessonResult>>();

export function clearLessons(): void { cache.clear(); }

const keyOf = (userId: string, materialId: string, topic: string) => JSON.stringify([userId, materialId, topic]);

export function getLesson(userId: string, materialId: string, topic: string): Promise<LessonResult> {
  if (!userId) return Promise.reject(new Error('Inicia sesión para abrir el refuerzo.'));
  const key = keyOf(userId, materialId, topic);
  const cached = cache.get(key);
  if (cached) return cached;

  const request = fetchLesson(materialId, topic);
  // Mantener un límite de memoria sin compartir contenido entre cuentas.
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, request);
  // Si falla, se olvida para que "Reintentar" haga una solicitud nueva
  request.catch(() => {
    if (cache.get(key) === request) cache.delete(key);
  });
  return request;
}

// Al terminar un examen nuevo de esos temas, la próxima lección debe ser otra
export function forgetLessons(userId: string, materialId: string, topics: string[]): void {
  for (const topic of topics) cache.delete(keyOf(userId, materialId, topic));
}
