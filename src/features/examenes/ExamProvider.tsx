// Estado del examen en curso, compartido por las pantallas de src/app/examen/.
// Uso:  const { run, startExam, checkAnswer, goNext, finishExam } = useExam();
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ExamKind } from '../../services/ai';
import { useSession } from '../../services/session';
import {
  createExam,
  gradeAnswer,
  saveAttempt,
  type ExamSession,
  type GradedAnswer,
  type PlayableQuestion,
  type SavedAttempt,
} from '../../services/exams';
import { forgetLessons } from './lessonCache';
import { advanceQuestion, completeAnswers } from './examState';

export interface ExamRun {
  materialId: string;
  session: ExamSession;
  index: number; // pregunta actual
  answers: Record<string, GradedAnswer>; // por id de pregunta
  saved: SavedAttempt | null; // se llena al guardar el intento
}

type ExamContextValue = {
  run: ExamRun | null;
  startExam: (materialId: string, kind: ExamKind, options: { count: number; topics?: string[] }) => Promise<void>;
  checkAnswer: (question: PlayableQuestion, choice: string) => Promise<GradedAnswer>;
  goNext: (questionId: string) => void;
  finishExam: () => Promise<SavedAttempt>;
};

const ExamContext = createContext<ExamContextValue | null>(null);

export function ExamProvider({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  const [run, setRun] = useState<ExamRun | null>(null);
  // Protecciones contra doble toque: se reutiliza la operación en curso
  const starting = useRef<Promise<void> | null>(null);
  const checking = useRef<Promise<GradedAnswer> | null>(null);
  const finishing = useRef<Promise<SavedAttempt> | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function startExam(materialId: string, kind: ExamKind, options: { count: number; topics?: string[] }) {
    if (starting.current) return starting.current;
    if (!userId) return Promise.reject(new Error('Vuelve a iniciar sesión.'));
    if (checking.current || finishing.current) return Promise.reject(new Error('Espera a que termine la operación actual.'));
    const task = createExam(materialId, kind, options)
      .then((session) => {
        if (mounted.current) setRun({ materialId, session, index: 0, answers: {}, saved: null });
      })
      .finally(() => {
        starting.current = null;
      });
    starting.current = task;
    return task;
  }

  function checkAnswer(question: PlayableQuestion, choice: string) {
    if (!run || starting.current || run.session.questions[run.index]?.id !== question.id || !question.options.includes(choice)) {
      return Promise.reject(new Error('Elige una opción de la pregunta actual.'));
    }
    const examId = run.session.examId;
    const done = run?.answers[question.id];
    if (done) return Promise.resolve(done); // ya se corrigió: no se cambia la respuesta
    if (checking.current) return checking.current;
    const task = gradeAnswer(question.id, choice)
      .then((graded) => {
        if (mounted.current) setRun((r) => (r?.session.examId === examId ? { ...r, answers: { ...r.answers, [question.id]: graded } } : r));
        return graded;
      })
      .finally(() => {
        checking.current = null;
      });
    checking.current = task;
    return task;
  }

  function goNext(questionId: string) {
    setRun(r => advanceQuestion(r, questionId));
  }

  function finishExam() {
    if (!run) return Promise.reject(new Error('No hay un examen en curso.'));
    if (run.saved) return Promise.resolve(run.saved);
    if (finishing.current) return finishing.current;
    if (!userId) return Promise.reject(new Error('Tu sesión expiró. Vuelve a iniciar sesión.'));

    const { materialId, session } = run;
    let ordered: GradedAnswer[];
    try { ordered = completeAnswers(run); } catch (error) { return Promise.reject(error); }
    const task = saveAttempt(session.examId, userId, ordered)
      .then((saved) => {
        forgetLessons(userId, materialId, [...new Set(session.questions.map((q) => q.topic))]);
        if (mounted.current) setRun((r) => (r && r.session.examId === session.examId ? { ...r, saved } : r));
        return saved;
      })
      .finally(() => {
        finishing.current = null;
      });
    finishing.current = task;
    return task;
  }

  return (
    <ExamContext.Provider value={{ run, startExam, checkAnswer, goNext, finishExam }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam(): ExamContextValue {
  const value = useContext(ExamContext);
  if (!value) throw new Error('useExam debe usarse dentro de ExamProvider (src/app/examen/_layout.tsx).');
  return value;
}
