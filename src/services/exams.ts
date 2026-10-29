// Servicio de exámenes y refuerzo (Parte 3 · Pablo).
// Crea exámenes con la IA, corrige cada pregunta contra exam_questions,
// guarda el intento completo y lee el estado de cada tema.
import { supabase } from "./supabase";
import { runAi, type AiResult, type ExamKind } from "./ai";
import { recordAttempt, type TopicStatus } from "./progress";
import type { ExamCount } from "../../supabase/functions/_shared/exam";

export type ExamOptions = { count: ExamCount; topics?: string[] };

export interface ExamMaterial {
  id: string;
  title: string;
  status: "pending" | "processing" | "ready" | "error";
  subject_id: string | null;
  created_at: string;
}

// Pregunta que la interfaz sabe mostrar (las abiertas se descartan)
export interface PlayableQuestion {
  id: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  topic: string; // si la IA no puso tema, "General" (igual que record_exam_attempt)
}

export interface ExamSession {
  examId: string;
  title: string;
  kind: ExamKind;
  questions: PlayableQuestion[];
}

export interface GradedAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}

export interface SavedAttempt {
  attemptId: string;
  score: number;
  total: number;
}

export type LessonResult = AiResult["lesson"];

export const GENERAL_TOPIC = "General";
const TRUE_FALSE_OPTIONS = ["Verdadero", "Falso"];

// ---------------------------------------------------------------------
// Errores comprensibles
// ---------------------------------------------------------------------
function isNetworkError(message: string): boolean {
  return /network|fetch|failed to send|timeout|conexi/i.test(message);
}

// Los errores de la IA ya vienen en español desde la función; solo
// traducimos los de red.
function aiError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "";
  if (!message || isNetworkError(message)) {
    return new Error("No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.");
  }
  return new Error(message);
}

// Los errores de la base de datos vienen en inglés: mostramos uno claro.
function dbError(message: string, friendly: string): Error {
  if (isNetworkError(message)) {
    return new Error("No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.");
  }
  return new Error(friendly);
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

// ---------------------------------------------------------------------
// Materiales del usuario
// ---------------------------------------------------------------------
export async function listMaterials(): Promise<ExamMaterial[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, status, subject_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw dbError(error.message, "No se pudieron cargar tus materiales.");
  return (data ?? []) as ExamMaterial[];
}

// ---------------------------------------------------------------------
// Temas del material: la consulta normal no consume llamadas a la IA.
// ---------------------------------------------------------------------
function topicList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string")
    .map((v) => v.trim()).filter((v) => v.length > 0 && v.length <= 100))].slice(0, 10);
}

export async function getExamTopics(materialId: string): Promise<string[]> {
  const { data, error } = await supabase.from("materials").select("topics").eq("id", materialId).single();
  if (error) throw dbError(error.message, "No se pudieron cargar los temas. Inténtalo de nuevo.");
  if (!data) throw new Error("No se encontró el material.");
  return topicList(data.topics);
}

export async function detectExamTopics(materialId: string): Promise<string[]> {
  try {
    const result = await runAi("topics", materialId);
    const topics = topicList(result.topics);
    if (!topics.length) throw new Error("No se encontraron temas. Prueba con apuntes más completos o legibles.");
    return topics;
  } catch (error) {
    throw aiError(error);
  }
}

// Crear examen con la IA
function toPlayable(q: {
  id: string;
  type: string;
  question: string;
  options: unknown;
  topic: string | null;
}): PlayableQuestion | null {
  const options = Array.isArray(q.options)
    ? q.options.filter((o): o is string => typeof o === "string" && o.trim() !== "")
    : [];
  const topic = q.topic?.trim() || GENERAL_TOPIC;
  if (q.type === "multiple_choice" && options.length >= 2) {
    return { id: q.id, type: "multiple_choice", question: q.question, options, topic };
  }
  if (q.type === "true_false") {
    return {
      id: q.id,
      type: "true_false",
      question: q.question,
      options: options.length === 2 ? options : TRUE_FALSE_OPTIONS,
      topic,
    };
  }
  return null; // abiertas o sin opciones: la interfaz no las soporta
}

export async function createExam(
  materialId: string,
  kind: ExamKind,
  options: ExamOptions
): Promise<ExamSession> {
  if (options.count === "auto" && (options.topics?.length !== 1 || !options.topics[0]?.trim())) {
    throw new Error("Elige un tema antes de crear el examen.");
  }
  let result;
  try {
    result = await runAi("exam", materialId, { kind, count: options.count, topics: options.topics });
  } catch (e) {
    throw aiError(e);
  }
  if (options.count === "auto" && result.countMode !== "auto") {
    throw new Error("El servidor todavía usa la versión anterior de exámenes. Falta desplegar la actualización de ai-study.");
  }
  const questions = [...result.questions]
    .sort((a, b) => a.position - b.position)
    .map(toPlayable)
    .filter((q): q is PlayableQuestion => q !== null);
  if (!questions.length) {
    throw new Error("La IA no generó preguntas de opción múltiple ni de verdadero o falso. Inténtalo de nuevo.");
  }
  if (options.count === "auto" && questions.some((q) => q.topic !== options.topics![0])) {
    throw new Error("Las preguntas no corresponden al tema elegido. Inténtalo de nuevo.");
  }
  return { examId: result.exam.id, title: result.exam.title, kind: result.exam.kind, questions };
}

// ---------------------------------------------------------------------
// Corrección formativa: este cliente consulta la solución y compara la respuesta.
// ---------------------------------------------------------------------
export async function gradeAnswer(questionId: string, userAnswer: string): Promise<GradedAnswer> {
  const { data, error } = await supabase
    .from("exam_questions")
    .select("correct_answer, explanation")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw dbError(error.message, "No se pudo comprobar tu respuesta. Inténtalo de nuevo.");
  if (!data) throw new Error("No se encontró la pregunta. Vuelve a empezar el examen.");
  const row = data as { correct_answer: string; explanation: string | null };
  return {
    questionId,
    userAnswer,
    isCorrect: normalizeAnswer(userAnswer) === normalizeAnswer(row.correct_answer),
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
  };
}

// ---------------------------------------------------------------------
// Guardar el intento al terminar. Cada paso revisa primero la base de datos,
// para reutilizar escrituras confirmadas al reintentar desde este cliente:
//  1) exam_attempts: un solo intento por examen (cada examen se responde una vez).
//  2) attempt_answers: un único insert; si ya hay respuestas, no se vuelve a insertar.
//  3) recordAttempt: solo si el intento aún no tiene finished_at.
// ---------------------------------------------------------------------
async function ensureAttempt(examId: string, userId: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .limit(1)
    .maybeSingle();
  if (findErr) throw dbError(findErr.message, "No se pudo guardar tu intento.");
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supabase
    .from("exam_attempts")
    .insert({ exam_id: examId, user_id: userId })
    .select("id")
    .single();
  if (error || !data) throw dbError(error?.message ?? "", "No se pudo guardar tu intento.");
  return (data as { id: string }).id;
}

function feedbackFor(a: GradedAnswer): string {
  const base = `Respondiste "${a.userAnswer}". La respuesta correcta es "${a.correctAnswer}".`;
  return a.explanation ? `${base} ${a.explanation}` : base;
}

async function ensureAnswers(attemptId: string, userId: string, answers: GradedAnswer[]): Promise<void> {
  const { count, error: countErr } = await supabase
    .from("attempt_answers")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attemptId);
  if (countErr) throw dbError(countErr.message, "No se pudieron guardar tus respuestas.");
  if ((count ?? 0) > 0) return; // ya se guardaron (el insert es uno solo: todo o nada)

  const rows = answers.map((a) => ({
    attempt_id: attemptId,
    question_id: a.questionId,
    user_id: userId,
    user_answer: a.userAnswer,
    is_correct: a.isCorrect,
    ai_feedback: a.isCorrect ? null : feedbackFor(a),
  }));
  const { error } = await supabase.from("attempt_answers").insert(rows);
  if (error) throw dbError(error.message, "No se pudieron guardar tus respuestas.");
}

async function ensureRecorded(attemptId: string): Promise<SavedAttempt> {
  const read = async () => {
    const { data, error } = await supabase
      .from("exam_attempts")
      .select("score, total, finished_at")
      .eq("id", attemptId)
      .single();
    if (error || !data) throw dbError(error?.message ?? "", "No se pudo calcular tu resultado.");
    return data as { score: number; total: number; finished_at: string | null };
  };

  let row = await read();
  if (!row.finished_at) {
    try {
      await recordAttempt(attemptId);
    } catch (e) {
      throw dbError(e instanceof Error ? e.message : "", "No se pudo calcular tu resultado.");
    }
    row = await read();
  }
  if (!row.finished_at || !Number.isFinite(row.score) || !Number.isFinite(row.total) || row.total < 1) {
    throw new Error("El resultado todavía no se ha confirmado. Reintenta guardar.");
  }
  return { attemptId, score: row.score, total: row.total };
}

export async function saveAttempt(
  examId: string,
  userId: string,
  answers: GradedAnswer[]
): Promise<SavedAttempt> {
  if (!answers.length) throw new Error("No hay respuestas para guardar.");
  const attemptId = await ensureAttempt(examId, userId);
  await ensureAnswers(attemptId, userId, answers);
  return ensureRecorded(attemptId);
}

// ---------------------------------------------------------------------
// Estado de los temas (topic_progress de la materia del material o "General")
// ---------------------------------------------------------------------
async function subjectIdFor(materialId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("materials")
    .select("subject_id")
    .eq("id", materialId)
    .maybeSingle();
  if (error) throw dbError(error.message, "No se pudo leer el progreso de tus temas.");
  const subjectId = (data as { subject_id: string | null } | null)?.subject_id ?? null;
  if (subjectId) return subjectId;

  const { data: general, error: genErr } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", "General")
    .limit(1)
    .maybeSingle();
  if (genErr) throw dbError(genErr.message, "No se pudo leer el progreso de tus temas.");
  return (general as { id: string } | null)?.id ?? null;
}

export async function getTopicStatuses(materialId: string, topics: string[]): Promise<Record<string, TopicStatus>> {
  if (!topics.length) return {};
  const subjectId = await subjectIdFor(materialId);
  if (!subjectId) return {};
  const { data, error } = await supabase
    .from("topic_progress")
    .select("id, topic, mastery, status, failed_rounds")
    .eq("subject_id", subjectId)
    .in("topic", topics);
  if (error) throw dbError(error.message, "No se pudo leer el progreso de tus temas.");
  const byTopic: Record<string, TopicStatus> = {};
  for (const row of (data ?? []) as TopicStatus[]) {
    byTopic[row.topic] = { ...row, mastery: Number(row.mastery) };
  }
  return byTopic;
}

// ---------------------------------------------------------------------
// Lección de refuerzo
// ---------------------------------------------------------------------
export async function fetchLesson(materialId: string, topic: string): Promise<LessonResult> {
  try {
    return await runAi("lesson", materialId, { topic });
  } catch (e) {
    throw aiError(e);
  }
}
