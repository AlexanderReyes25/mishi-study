// Estado del examen en curso, compartido por las pantallas de src/app/examen/.
// Uso:  const { run, startExam, checkAnswer, goNext, finishExam } = useExam();
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
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
  goNext: () => void;
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

  function startExam(materialId: string, kind: ExamKind, options: { count: number; topics?: string[] }) {
    if (starting.current) return starting.current;
    const task = createExam(materialId, kind, options)
      .then((session) => {
        setRun({ materialId, session, index: 0, answers: {}, saved: null });
      })
      .finally(() => {
        starting.current = null;
      });
    starting.current = task;
    return task;
  }

  function checkAnswer(question: PlayableQuestion, choice: string) {
    const done = run?.answers[question.id];
    if (done) return Promise.resolve(done); // ya se corrigió: no se cambia la respuesta
    if (checking.current) return checking.current;
    const task = gradeAnswer(question.id, choice)
      .then((graded) => {
        setRun((r) => (r ? { ...r, answers: { ...r.answers, [question.id]: graded } } : r));
        return graded;
      })
      .finally(() => {
        checking.current = null;
      });
    checking.current = task;
    return task;
  }

  function goNext() {
    setRun((r) => (r && r.index < r.session.questions.length - 1 ? { ...r, index: r.index + 1 } : r));
  }

  function finishExam() {
    if (!run) return Promise.reject(new Error('No hay un examen en curso.'));
    if (run.saved) return Promise.resolve(run.saved);
    if (finishing.current) return finishing.current;
    if (!userId) return Promise.reject(new Error('Tu sesión expiró. Vuelve a iniciar sesión.'));

    const { materialId, session, answers } = run;
    const ordered = session.questions
      .map((q) => answers[q.id])
      .filter((a): a is GradedAnswer => a !== undefined);
    const task = saveAttempt(session.examId, userId, ordered)
      .then((saved) => {
        forgetLessons(materialId, [...new Set(session.questions.map((q) => q.topic))]);
        setRun((r) => (r && r.session.examId === session.examId ? { ...r, saved } : r));
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
