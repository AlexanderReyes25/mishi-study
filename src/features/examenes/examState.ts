import type { ExamRun } from './ExamProvider';

// The question id also protects against two queued taps on the same button.
export function advanceQuestion(run: ExamRun | null, questionId: string): ExamRun | null {
  if (!run || run.session.questions[run.index]?.id !== questionId || !run.answers[questionId]
    || run.index >= run.session.questions.length - 1) return run;
  return { ...run, index: run.index + 1 };
}

export function completeAnswers(run: ExamRun) {
  const answers = run.session.questions.map(q => run.answers[q.id]);
  if (!answers.length || answers.some(a => !a)) {
    throw new Error('Responde y comprueba todas las preguntas antes de guardar el examen.');
  }
  return answers;
}
