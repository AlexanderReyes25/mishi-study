import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { cargarLeccion, prepararTarjetas, type LeccionGuardada } from '../../services/estudioIntegracion';
import { colors, spacing } from '../../theme';
import { LessonScreen } from './LessonScreen';

export function LeccionConectada({ userId, materialId, topic }: {
  userId: string; materialId: string; topic: string;
}) {
  const [lesson, setLesson] = useState<LeccionGuardada | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    cargarLeccion(userId, materialId, topic)
      .then((saved) => { if (active) setLesson(saved); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudo abrir la lección.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, materialId, topic, attempt]);

  async function openCards() {
    if (busy.current) return;
    busy.current = true;
    setPreparing(true);
    setError('');
    try {
      await prepararTarjetas(userId, materialId);
      if (mounted.current) router.push({ pathname: '/estudio/flashcards', params: { materialId } });
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'No se pudieron preparar las tarjetas.');
    } finally {
      busy.current = false;
      if (mounted.current) setPreparing(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  if (!lesson) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.error }}>{error}</Text>
        <Button label="Reintentar" onPress={() => {
          setLoading(true);
          setError('');
          setAttempt((n) => n + 1);
        }} />
      </View>
    );
  }
  return (
    <LessonScreen title={lesson.title} blocks={lesson.blocks} content={lesson.content}>
      <Text style={{ color: colors.textMuted }}>
        Las tarjetas repasan todos los temas de este material. Si ya existen, las reutilizamos.
      </Text>
      <Button label="Practicar con tarjetas" icon="layers-outline" loading={preparing} onPress={openCards} />
      <Button label="Examen diagnóstico" icon="clipboard-outline" variant="accent" disabled={preparing} onPress={() => router.push({ pathname: '/examen/diagnostico', params: { materialId, title: lesson.title } })} />
      <Button label="Revisar mi procedimiento" icon="pencil-outline" variant="secondary" disabled={preparing} onPress={() => router.push('/estudio/practica')} />
      {preparing ? <Text style={{ color: colors.textMuted }}>Preparando las tarjetas…</Text> : null}
      {error ? <Text selectable style={{ color: colors.error }}>{error}</Text> : null}
    </LessonScreen>
  );
}
