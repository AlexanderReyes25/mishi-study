import { supabase } from "./supabase";

export type AiAction = "topics" | "summary" | "flashcards" | "exam" | "lesson";
export type ExamKind = "diagnostic" | "practice" | "reevaluation";

export interface AiOptions {
  difficulty?: number;
  count?: number;
  force?: boolean;
  topic?: string;
  kind?: ExamKind;
  topics?: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: number;
}

export interface ExamQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "open";
  question: string;
  options: string[] | null;
  topic: string | null;
  position: number;
}

export type AiResult = {
  topics: { topics: string[]; subject_guess: string; cached: boolean };
  summary: { summary: string; cached: boolean };
  flashcards: { flashcards: Flashcard[] };
  exam: {
    exam: { id: string; title: string; kind: ExamKind };
    questions: ExamQuestion[];
  };
  lesson: { title: string; lesson: string; round: number };
};

export async function runAi<A extends AiAction>(
  action: A,
  materialId: string,
  options: AiOptions = {}
): Promise<AiResult[A]> {
  // Una sola solicitud: reintentar automáticamente una escritura puede duplicarla.
  const { data, error } = await supabase.functions.invoke("ai-study", {
    body: { action, materialId, ...options },
  });
  if (!error) return data as AiResult[A];

  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    const body = await context?.json();
    if (typeof body?.error === "string") message = body.error;
  } catch {
    // Conservamos el mensaje original si la respuesta no contiene JSON.
  }
  throw new Error(message);
}
