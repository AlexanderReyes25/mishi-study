// Contrato compartido por la app, la Edge Function y sus pruebas.
export const MAX_EXAM_QUESTIONS = 15;
export type ExamCount = number | "auto";

export interface GeneratedExamQuestion {
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
}

export function examQuestionLimit(value: unknown): number {
  if (value === "auto") return MAX_EXAM_QUESTIONS;
  const n = typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_EXAM_QUESTIONS, Math.round(n))) : 8;
}

export function examTask(limit: number, focus: string[], materialTopics: string[]): string {
  const allowed = focus.length ? focus : materialTopics;
  const scope = focus.length
    ? `Evalúa SOLO los temas seleccionados: ${JSON.stringify(focus)}. Ignora el resto del archivo al decidir las preguntas y su cantidad.`
    : "Evalúa el contenido de estudio del material.";
  return `${scope}
${allowed.length ? `En "topic" copia exactamente uno de estos nombres: ${JSON.stringify(allowed)}.` : 'En "topic" usa un nombre breve del tema evaluado.'}

Decide cuántas preguntas útiles permite el contenido disponible, con un máximo de ${limit}.
NO existe un mínimo: 1, 2 o 5 preguntas son válidas si eso es todo lo que el tema permite.
El máximo es un límite, NO una meta. Unas pocas líneas no justifican un examen largo.
Primero identifica los conceptos o procedimientos distintos que realmente explica el material.
Evalúa esos puntos sin rellenar, repetir la misma idea con otras palabras, ni multiplicar ejercicios cambiando solo cifras.
La cantidad depende del contenido del tema seleccionado, NO del número de páginas, de los demás temas ni de la dificultad.
No inventes datos, supuestos, definiciones ni conocimientos externos para añadir preguntas.
Si no hay contenido legible suficiente para UNA pregunta con respuesta verificable, devuelve "questions": [].
Usa solo "multiple_choice" y "true_false"; no es obligatorio mezclar ambos tipos.
Opción múltiple: de 2 a 4 opciones distintas, con una sola correcta. Verdadero/falso: opciones ["Verdadero", "Falso"].
Resuelve y verifica cada pregunta antes de incluirla. "correct_answer" debe ser idéntico a una opción.
Explica la solución basándote en el material. Descarta cualquier pregunta ambigua o que no puedas verificar.
Usa $...$ y $$...$$ para fórmulas en preguntas, opciones y explicaciones; escapa las barras de LaTeX en JSON.
Devuelve únicamente JSON:
{"title":"título del examen","questions":[{"type":"multiple_choice","question":"...","options":["A","B"],"correct_answer":"A","explanation":"...","topic":"nombre exacto"}]}`;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : "";
}

function key(value: string): string {
  return value.replace(/\s+/g, " ").toLocaleLowerCase("es");
}

// Valida estructura, tema y duplicados exactos. La veracidad semántica sigue
// dependiendo del modelo: esta validación no demuestra que una solución sea correcta.
export function parseExamQuestions(value: unknown, allowedTopics: string[], limit: number): GeneratedExamQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: GeneratedExamQuestion[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const q = raw as Record<string, unknown>;
    if (q.type !== "multiple_choice" && q.type !== "true_false") continue;
    const question = text(q.question, 4000);
    const topic = text(q.topic, 100);
    const explanation = text(q.explanation, 4000);
    const answer = text(q.correct_answer, 2000);
    if (!question || !topic || !explanation || !answer) continue;
    if (allowedTopics.length && !allowedTopics.includes(topic)) continue;
    if (!Array.isArray(q.options)) continue;
    const options = q.options.map((option) => text(option, 2000));
    if (options.length < 2 || options.length > 4 || options.some((option) => !option)) continue;
    // Las mayúsculas pueden distinguir variables matemáticas; no las colapsamos.
    if (new Set(options.map((option) => option.replace(/\s+/g, " "))).size !== options.length) continue;
    if (!options.includes(answer)) continue;
    if (q.type === "true_false" && (options.length !== 2 || !options.includes("Verdadero") || !options.includes("Falso"))) continue;
    const identity = key(question);
    if (seen.has(identity)) continue;
    seen.add(identity);
    questions.push({ type: q.type, question, topic, explanation, options, correct_answer: answer });
    if (questions.length >= examQuestionLimit(limit)) break;
  }
  return questions;
}
