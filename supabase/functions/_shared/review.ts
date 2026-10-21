export const MAX_EXERCISE = 4000;
export const MAX_PROCEDURE = 12000;
export const MAX_REVIEW_IMAGE_BYTES = 3 * 1024 * 1024;

export type ProcedureStatus = 'correct' | 'incorrect' | 'incomplete' | 'missing' | 'unverifiable';
export type ResultStatus = 'correct' | 'incorrect' | 'not_shown' | 'unverifiable';
export type StepStatus = 'correct' | 'incorrect' | 'uncertain';
export type ReviewedStep = { quote: string; status: StepStatus; feedback: string };
export type ReviewResult = {
  procedureStatus: ProcedureStatus;
  resultStatus: ResultStatus;
  summary: string;
  steps: ReviewedStep[];
  nextHint: string;
  firstErrorStep: number | null;
};
export type Transcription = { text: string; legible: boolean; uncertain: string[] };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Formato de revisión inválido.');
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) {
    throw new Error('La revisión contiene un texto inválido.');
  }
  return value.trim();
}

function choice<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new Error('Estado de revisión inválido.');
  return value as T;
}

export function validateReviewInput(exercise: unknown, procedure: unknown) {
  return { exercise: text(exercise, MAX_EXERCISE), procedure: text(procedure, MAX_PROCEDURE) };
}

export function parseTranscription(value: unknown): Transcription {
  const data = object(value);
  const content = text(data.text, MAX_PROCEDURE, true);
  if (typeof data.legible !== 'boolean' || !Array.isArray(data.uncertain) || data.uncertain.length > 8) {
    throw new Error('La lectura de la fotografía tiene un formato inválido.');
  }
  const uncertain = data.uncertain.map((item) => text(item, 400));
  if (data.legible && (!content || uncertain.length || /\[ilegible\]/i.test(content))) {
    throw new Error('La lectura de la fotografía es contradictoria. Vuelve a intentarlo.');
  }
  if (!data.legible && !uncertain.length) throw new Error('Falta indicar qué parte de la foto no pudo leerse.');
  return { text: content, legible: data.legible, uncertain };
}

const normalized = (value: string) => value.normalize('NFC').replace(/\s+con/g, ' ').trim();

export function parseReview(value: unknown, submittedProcedure: string): ReviewResult {
  const data = object(value);
  const procedureStatus = choice(data.procedureStatus, ['correct', 'incorrect', 'incomplete', 'missing', 'unverifiable'] as const);
  const resultStatus = choice(data.resultStatus, ['correct', 'incorrect', 'not_shown', 'unverifiable'] as const);
  if (!Array.isArray(data.steps) || data.steps.length > 20) throw new Error('La revisión admite hasta 20 pasos.');
  const source = normalized(submittedProcedure);
  let cursor = 0;
  const steps = data.steps.map((value): ReviewedStep => {
    const item = object(value);
    const quote = text(item.quote, 800);
    const evidence = normalized(quote);
    const position = source.indexOf(evidence, cursor);
    if (position < 0) throw new Error('La IA citó un paso que no coincide con tu procedimiento. Reintenta la revisión.');
    cursor = position + evidence.length;
    return {
      quote,
      status: choice(item.status, ['correct', 'incorrect', 'uncertain'] as const),
      feedback: text(item.feedback, 1200),
    };
  });
  const firstError = steps.findIndex((step) => step.status === 'incorrect');
  if (procedureStatus === 'missing' && steps.length) throw new Error('La revisión inventó pasos para un procedimiento ausente.');
  if (procedureStatus === 'correct' && (!steps.length || resultStatus !== 'correct' || steps.some((step) => step.status !== 'correct'))) {
    throw new Error('La revisión contiene conclusiones contradictorias.');
  }
  if (procedureStatus === 'incorrect' && firstError < 0) throw new Error('Falta señalar el paso incorrecto.');
  if (firstError >= 0 && procedureStatus !== 'incorrect') throw new Error('El estado no coincide con los errores señalados.');
  if (procedureStatus === 'incomplete' && !steps.length) throw new Error('Faltan los pasos parciales del procedimiento.');
  if (/\[ilegible\]/i.test(submittedProcedure) && procedureStatus !== 'unverifiable') {
    throw new Error('Completa el contenido ilegible antes de evaluar el procedimiento.');
  }
  return {
    procedureStatus, resultStatus, steps,
    summary: text(data.summary, 1800),
    nextHint: text(data.nextHint, 1200),
    firstErrorStep: firstError < 0 ? null : firstError + 1,
  };
}