import { supabase } from "./supabase";

export const PASS_MARK = 60; // % mínimo para aprobar un tema
export const MIN_QUESTIONS_PER_TOPIC = 3; // preguntas mínimas para que un tema cambie de estado
export const ROUNDS_BEFORE_SIMPLER_METHOD = 3; // tras estos refuerzos, la IA usa otro método

export interface SubjectPriority {
  subject_id: string;
  name: string;
  weight: number; // 1 a 3
  topics_total: number;
  topics_approved: number;
  mastery: number; // dominio promedio 0-100
  priority: number; // (100 - dominio) x peso: mayor = estudiar antes
}

export interface TopicStatus {
  id: string;
  topic: string;
  mastery: number;
  status: "pending" | "reinforcing" | "approved";
  failed_rounds: number;
}

export async function recordAttempt(attemptId: string): Promise<void> {
  const { error } = await supabase.rpc("record_exam_attempt", {
    p_attempt_id: attemptId,
  });
  if (error) throw new Error(error.message);
}

export async function getSubjectPriorities(): Promise<SubjectPriority[]> {
  const { data, error } = await supabase
    .from("subject_priority")
    .select("*")
    .order("priority", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubjectPriority[];
}

export async function getTopicsToReinforce(
  subjectId: string
): Promise<TopicStatus[]> {
  const { data, error } = await supabase
    .from("topic_progress")
    .select("id, topic, mastery, status, failed_rounds")
    .eq("subject_id", subjectId)
    .neq("status", "approved")
    .order("mastery", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TopicStatus[];
}

export function needsDiagnostic(s: SubjectPriority): boolean {
  return s.topics_total === 0;
}

export function isSubjectApproved(s: SubjectPriority): boolean {
  return s.topics_total > 0 && s.topics_approved === s.topics_total;
}