// Lista de materiales del usuario con el botón "Examen diagnóstico".
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { listMaterials, type ExamMaterial } from '../../services/exams';
import { ErrorCard, LoadingCard } from '../../features/examenes/components/StatusCards';
import { goBackOr } from '../../features/examenes/navigation';
import { colors, font } from '../../theme';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; materials: ExamMaterial[] };

const statusLabel: Record<ExamMaterial['status'], string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  ready: 'Listo',
  error: 'La última solicitud a la IA falló',
};

export default function ExamenInicio() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    listMaterials()
      .then((materials) => {
        if (alive) setState({ kind: 'ready', materials });
      })
      .catch((e: unknown) => {
        if (alive) setState({ kind: 'error', message: e instanceof Error ? e.message : 'No se pudieron cargar tus materiales.' });
      });
    return () => {
      alive = false;
    };
  }, [reload]);

  function retry() {
    setState({ kind: 'loading' });
    setReload((n) => n + 1);
  }

  return (
    <Screen title="Exámenes" subtitle="Elige un material para medir qué temas dominas">
      {state.kind === 'loading' ? <LoadingCard title="Cargando tus materiales…" /> : null}
      {state.kind === 'error' ? <ErrorCard message={state.message} onRetry={retry} /> : null}

      {state.kind === 'ready' && state.materials.length === 0 ? (
        <Card>
          <Text style={styles.text}>Aún no tienes materiales. Sube uno en la pestaña Materiales.</Text>
          <Button label="Ir a Materiales" onPress={() => router.replace('/materiales')} />
        </Card>
      ) : null}

      {state.kind === 'ready'
        ? state.materials.map((m) => (
            <Card key={m.id}>
              <Text style={styles.title}>{m.title}</Text>
              <Text style={styles.muted}>Estado: {statusLabel[m.status]}</Text>
              <Button
                label="Examen diagnóstico"
                onPress={() =>
                  router.push({ pathname: '/examen/diagnostico', params: { materialId: m.id, title: m.title } })
                }
              />
            </Card>
          ))
        : null}

      <Button label="Volver" variant="secondary" onPress={() => goBackOr('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.text },
  muted: { fontSize: font.small, color: colors.textMuted },
});
