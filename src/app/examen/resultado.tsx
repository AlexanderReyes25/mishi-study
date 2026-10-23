// Resultados del examen por tema (lee topic_progress después de recordAttempt).
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Page as Screen, Tag, SectionHeading } from '../../components/MishiUI';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { PASS_MARK, type TopicStatus } from '../../services/progress';
import { getTopicStatuses, type SavedAttempt } from '../../services/exams';
import { useExam, type ExamRun } from '../../features/examenes/ExamProvider';
import { TopicResultCard } from '../../features/examenes/components/TopicResultCard';
import { ErrorCard, LoadingCard } from '../../features/examenes/components/StatusCards';
import { percent } from '../../features/examenes/format';
import { colors, font } from '../../theme';

type SavedRun = ExamRun & { saved: SavedAttempt };

export default function Resultado() {
  const { run } = useExam();
  // Se fija el examen de esta pantalla: si después empieza una reevaluación,
  // esta pantalla (que queda debajo en la pila) no cambia ni redirige.
  const [examId] = useState(run?.session.examId);
  const [pinned, setPinned] = useState<SavedRun | null>(run?.saved ? (run as SavedRun) : null);
  if (!pinned && run?.saved && run.session.examId === examId) {
    setPinned(run as SavedRun); // el guardado terminó justo al abrir la pantalla
  }

  if (pinned) return <ResultView run={pinned} />;
  if (!run || run.session.examId !== examId) return <Redirect href="/examen" />;
  return (
    <Screen title="Resultados">
      <LoadingCard title="Guardando tu examen…" />
      <Button label="Ver mi progreso" icon="stats-chart-outline" onPress={() => router.dismissTo('/(tabs)/progreso')} />
      <Button label="Otros exámenes" variant="secondary" onPress={() => router.dismissTo('/examen')} />
    </Screen>
  );
}

type TopicRow = { topic: string; correct: number; total: number };

type StatusState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; byTopic: Record<string, TopicStatus> };

function ResultView({ run }: { run: SavedRun }) {
  const { materialId, session, answers, saved } = run;

  // Resultado de este examen agrupado por tema, en el orden en que aparecieron
  const rows = useMemo(() => {
    const map = new Map<string, TopicRow>();
    for (const q of session.questions) {
      const a = answers[q.id];
      if (!a) continue;
      const row = map.get(q.topic) ?? { topic: q.topic, correct: 0, total: 0 };
      row.total += 1;
      if (a.isCorrect) row.correct += 1;
      map.set(q.topic, row);
    }
    return [...map.values()];
  }, [session.questions, answers]);

  const [status, setStatus] = useState<StatusState>({ kind: 'loading' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    getTopicStatuses(
      materialId,
      rows.map((r) => r.topic)
    )
      .then((byTopic) => {
        if (alive) setStatus({ kind: 'ready', byTopic });
      })
      .catch((e: unknown) => {
        if (alive) setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'No se pudo leer el progreso.' });
      });
    return () => {
      alive = false;
    };
  }, [materialId, rows, reload]);

  function retry() {
    setStatus({ kind: 'loading' });
    setReload((n) => n + 1);
  }

  const pct = percent(saved.score, saved.total);
  const passed = pct >= PASS_MARK;

  return (
    <Screen eyebrow="MISHI / TU RESULTADO" title="Un paso más adelante" subtitle={session.title}>
      <Card style={{backgroundColor:passed?colors.successSoft:colors.coralSoft}}>
        <Tag label="Intento guardado" tone="success"/>
        <Text style={styles.score} accessibilityRole="header">
          {saved.score} de {saved.total} correctas · {pct}%
        </Text>
        <ProgressBar value={pct} />
        <Text style={[styles.message, { color: passed ? colors.text : colors.error }]}>
          <Ionicons name={passed ? 'checkmark-circle' : 'refresh-circle'} size={font.body} />{' '}
          {passed
            ? '¡Buen trabajo! Revisa abajo cada tema.'
            : `Algunos temas necesitan refuerzo. Se aprueba con ${PASS_MARK}% o más.`}
        </Text>
      </Card>

      {status.kind === 'loading' ? <LoadingCard title="Actualizando tu progreso por tema…" /> : null}
      {status.kind === 'error' ? <ErrorCard message={status.message} onRetry={retry} /> : null}

      <SectionHeading title="Tu resultado por tema"/>
      {rows.map((row) => (
        <TopicResultCard
          key={row.topic}
          topic={row.topic}
          correct={row.correct}
          total={row.total}
          status={status.kind === 'ready' ? status.byTopic[row.topic] : undefined}
          onReinforce={() =>
            router.push({ pathname: '/examen/refuerzo', params: { materialId, topic: row.topic } })
          }
        />
      ))}

      <Button label="Ver mi progreso" icon="stats-chart-outline" onPress={() => router.dismissTo('/(tabs)/progreso')} />
      <Button label="Otros exámenes" variant="secondary" onPress={() => router.dismissTo('/examen')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { fontSize: font.title, fontWeight: '800', color: colors.text },
  message: { fontSize: font.body },
});
