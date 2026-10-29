// Pantalla de introducción común al examen diagnóstico y a la reevaluación.
// La IA solo se llama al tocar el botón (nunca en un efecto): así no hay
// solicitudes duplicadas ni reintentos automáticos.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Page as Screen, IconTile, Tag, ui } from '../../../components/MishiUI';
import { PantallaCarga } from '../../../components/PantallaCarga';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import type { ExamKind } from '../../../services/ai';
import type { ExamOptions } from '../../../services/exams';
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
  count: ExamOptions['count'];
  topics?: string[];
  onChangeTopic?: () => void;
};

export function ExamIntro({ title, subtitle, points, materialId, kind, count, topics, onChangeTopic }: Props) {
  const { startExam } = useExam();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function start() {
    if (loading) return;
    setLoading(true);
    setShowLoading(true);
    setError(null);
    startExam(materialId, kind, { count, topics })
      .then(() => { if (mounted.current) { setShowLoading(false); router.replace('/examen/pregunta'); } })
      .catch((e: unknown) => {
        if (!mounted.current) return;
        setError(e instanceof Error ? e.message : 'No se pudo crear el examen. Inténtalo de nuevo.');
        setLoading(false);
        setShowLoading(false);
      });
  }

  return (
    <Screen eyebrow="MISHI / EXÁMENES" title={title} subtitle={subtitle}>
      <Card style={{backgroundColor:colors.coralSoft}}>
        <View style={ui.headingRow}><IconTile icon="clipboard-outline" tone="coral"/><Tag label={kind==='reevaluation'?'VUELVE A INTENTARLO':'TU PUNTO DE PARTIDA'} tone="coral"/></View>
        <Text style={ui.sectionTitle}>{kind==='reevaluation'?'Mira cuánto avanzaste':'Descubre lo que ya sabes'}</Text>
        <Text style={ui.body}>Lee con calma. Mishi te explicará cada respuesta y te ayudará a reforzar lo que necesites.</Text>
      </Card>
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
          message="Mishi está preparando las preguntas. Mantén esta pantalla abierta hasta que termine."
        />
      ) : null}
      {error ? <ErrorCard message={error} /> : null}

      <Button
        label={error ? 'Reintentar' : 'Comenzar examen'}
        onPress={start}
        icon="play-outline"
        loading={loading}
        disabled={!materialId}
      />
      <Button label="Volver" variant="secondary" onPress={() => goBackOr('/examen')} disabled={loading} />
      {onChangeTopic ? <Button label="Elegir otro tema" variant="secondary" onPress={onChangeTopic} disabled={loading} /> : null}
      {loading && showLoading ? <PantallaCarga title="Preparando tu examen" closeLabel="Ver estado" note="El examen se abrirá al terminar. Mantén la app abierta." onClose={()=>setShowLoading(false)}/> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  pointText: { flex: 1, fontSize: font.body, color: colors.text },
});
