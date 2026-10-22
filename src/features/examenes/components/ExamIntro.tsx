// Pantalla de introducción común al examen diagnóstico y a la reevaluación.
// La IA solo se llama al tocar el botón (nunca en un efecto): así no hay
// solicitudes duplicadas ni reintentos automáticos.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../components/Screen';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import type { ExamKind } from '../../../services/ai';
import { colors, font, spacing } from '../../../theme';
import { useExam } from '../ExamProvider';
import { goBackOr } from '../navigation';
import { ErrorCard, LoadingCard } from './StatusCards';

type Props = {
  title: string;
  subtitle: string;
  points: string[];
  materialId: string;
  kind: ExamKind;
  count: number;
  topics?: string[];
};

export function ExamIntro({ title, subtitle, points, materialId, kind, count, topics }: Props) {
  const { startExam } = useExam();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    if (loading) return;
    setLoading(true);
    setError(null);
    startExam(materialId, kind, { count, topics })
      .then(() => router.replace('/examen/pregunta'))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'No se pudo crear el examen. Inténtalo de nuevo.');
        setLoading(false);
      });
  }

  return (
    <Screen title={title} subtitle={subtitle}>
      <Card>
        {points.map((point) => (
          <View key={point} style={styles.point}>
            <Ionicons name="checkmark-circle" size={font.subtitle} color={colors.successDark} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </Card>

      {loading ? (
        <LoadingCard
          title="Creando tu examen…"
          message="La IA puede tardar hasta un minuto. No cierres la app."
        />
      ) : null}
      {error ? <ErrorCard message={error} /> : null}

      <Button
        label={error ? 'Reintentar' : 'Comenzar examen'}
        onPress={start}
        loading={loading}
        disabled={!materialId}
      />
      <Button label="Volver" variant="secondary" onPress={() => goBackOr('/examen')} disabled={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  pointText: { flex: 1, fontSize: font.body, color: colors.text },
});
