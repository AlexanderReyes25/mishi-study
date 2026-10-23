// Lección de refuerzo de un tema (Markdown con LaTeX) y acceso a la reevaluación.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Page as Screen } from '../../components/MishiUI';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MathText } from '../../components/MathText';
import { LessonView as LessonBlocks } from '../../features/estudio/LessonView';
import { ROUNDS_BEFORE_SIMPLER_METHOD } from '../../services/progress';
import { getTopicStatuses, type LessonResult } from '../../services/exams';
import { getLesson } from '../../features/examenes/lessonCache';
import { useSession } from '../../services/session';
import { ErrorCard, LoadingCard } from '../../features/examenes/components/StatusCards';
import { goBackOr } from '../../features/examenes/navigation';
import { firstParam } from '../../features/examenes/params';
import { colors, font, spacing } from '../../theme';

type LessonState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; lesson: LessonResult };

export default function Refuerzo() {
  const params = useLocalSearchParams<{ materialId?: string; topic?: string }>();
  const materialId = firstParam(params.materialId);
  const topic = firstParam(params.topic);

  if (!materialId || !topic) {
    return (
      <Screen title="Refuerzo">
        <ErrorCard message="Falta el material o el tema. Vuelve a los resultados y elige un tema." />
        <Button label="Ver mis materiales" onPress={() => goBackOr('/examen')} />
      </Screen>
    );
  }
  return <LessonView materialId={materialId} topic={topic} />;
}

function LessonView({ materialId, topic }: { materialId: string; topic: string }) {
  const { userId } = useSession();
  const [lesson, setLesson] = useState<LessonState>({ kind: 'loading' });
  const [reload, setReload] = useState(0);
  const [failedRounds, setFailedRounds] = useState(0);

  // getLesson guarda la solicitud en memoria: el doble efecto de desarrollo
  // y volver a esta pantalla no hacen una segunda llamada a la IA.
  useEffect(() => {
    let alive = true;
    getLesson(userId ?? '', materialId, topic)
      .then((result) => {
        if (alive) setLesson({ kind: 'ready', lesson: result });
      })
      .catch((e: unknown) => {
        if (alive) setLesson({ kind: 'error', message: e instanceof Error ? e.message : 'No se pudo crear la lección.' });
      });
    return () => {
      alive = false;
    };
  }, [userId, materialId, topic, reload]);

  // Cuántos refuerzos lleva el tema (no bloquea la lección si falla)
  useEffect(() => {
    let alive = true;
    getTopicStatuses(materialId, [topic])
      .then((byTopic) => {
        if (alive) setFailedRounds(byTopic[topic]?.failed_rounds ?? 0);
      })
      .catch(() => {
        // Sin conexión solo se omite el aviso; la lección sigue disponible.
      });
    return () => {
      alive = false;
    };
  }, [materialId, topic]);

  function retry() {
    setLesson({ kind: 'loading' });
    setReload((n) => n + 1);
  }

  return (
    <Screen title="Refuerzo" subtitle={topic}>
      {failedRounds >= ROUNDS_BEFORE_SIMPLER_METHOD ? (
        <Card>
          <View style={styles.warning} accessible accessibilityRole="alert">
            <Ionicons name="information-circle" size={font.title} color={colors.accent} />
            <View style={styles.warningTexts}>
              <Text style={styles.warningTitle}>Ya van {failedRounds} refuerzos de este tema</Text>
              <Text style={styles.warningText}>
                Esta lección usa un método más sencillo, con ejemplos cotidianos. Si te sigue costando, consulta a tu
                profesor: una explicación en persona puede ayudarte mucho.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {lesson.kind === 'loading' ? (
        <LoadingCard title="Preparando tu lección…" message="La IA puede tardar hasta un minuto." />
      ) : null}
      {lesson.kind === 'error' ? <ErrorCard message={lesson.message} onRetry={retry} /> : null}

      {lesson.kind === 'ready' ? (
        <Card>
          <Text style={styles.title} accessibilityRole="header">
            {lesson.lesson.title}
          </Text>
          <Text style={styles.round}>Refuerzo n.º {lesson.lesson.round}</Text>
          <>{lesson.lesson.blocks?.length ? <LessonBlocks blocks={lesson.lesson.blocks}/> : <MathText text={lesson.lesson.lesson} color={colors.text} />}</>
        </Card>
      ) : null}

      <Button
        label="Reevaluar este tema"
        onPress={() => router.push({ pathname: '/examen/reevaluacion', params: { materialId, topic } })}
        disabled={lesson.kind === 'loading'}
      />
      <Button label="Volver a los resultados" variant="secondary" onPress={() => goBackOr('/examen')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  warningTexts: { flex: 1, gap: spacing.xs },
  warningTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  warningText: { fontSize: font.body, color: colors.text },
  title: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  round: { fontSize: font.small, color: colors.textMuted },
});
