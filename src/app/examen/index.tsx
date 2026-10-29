// Lista de materiales del usuario con el botón "Examen diagnóstico".
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Page as Screen, IconTile, Tag, EmptyState, SectionHeading, ui } from '../../components/MishiUI';
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
    <Screen eyebrow="MISHI / EXÁMENES" title="Pon a prueba tus ideas" subtitle="Cada respuesta te ayuda a saber qué aprendiste y cuál es tu siguiente paso.">
      <Card style={{backgroundColor:colors.coralSoft}}><View style={ui.headingRow}><IconTile icon="clipboard-outline" tone="coral"/><Tag label="A PARTIR DE TUS APUNTES" tone="coral"/></View><Text style={ui.sectionTitle}>Aprende también de tus errores</Text><Text style={ui.body}>Recibe una explicación después de cada respuesta. Al terminar, tu resultado se guarda en Progreso.</Text></Card>
      <SectionHeading title="Elige tu material"/>
      {state.kind === 'loading' ? <LoadingCard title="Cargando tus materiales…" /> : null}
      {state.kind === 'error' ? <ErrorCard message={state.message} onRetry={retry} /> : null}

      {state.kind === 'ready' && state.materials.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="Empecemos por tus apuntes" description="Añade un material para preparar tu primer examen."><Button label="Ir a Materiales" onPress={() => router.dismissTo('/(tabs)/materiales')} /></EmptyState>
      ) : null}

      {state.kind === 'ready'
        ? state.materials.map((m) => (
            <Card key={m.id}>
              <Text style={styles.title}>{m.title}</Text>
              <Tag label={statusLabel[m.status]} tone={m.status==='ready'?'success':'neutral'}/>
              <Button
                label="Elegir tema del examen" icon="arrow-forward" disabled={m.status==='processing'}
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
