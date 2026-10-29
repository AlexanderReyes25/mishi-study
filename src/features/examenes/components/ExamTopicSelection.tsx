import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { MAX_EXAM_QUESTIONS } from '../../../../supabase/functions/_shared/exam';
import { Page, SectionHeading, ui } from '../../../components/MishiUI';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { detectExamTopics, getExamTopics } from '../../../services/exams';
import { MIN_QUESTIONS_PER_TOPIC, PASS_MARK } from '../../../services/progress';
import { goBackOr } from '../navigation';
import { ExamIntro } from './ExamIntro';
import { ErrorCard, LoadingCard } from './StatusCards';

type State =
  | { kind: 'loading' | 'detecting' }
  | { kind: 'ready'; topics: string[] }
  | { kind: 'error'; message: string; retry: 'load' | 'detect' };

export function ExamTopicSelection({ materialId, title }: { materialId: string; title: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const mounted = useRef(false);
  const detecting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    getExamTopics(materialId)
      .then((topics) => { if (alive) setState({ kind: 'ready', topics }); })
      .catch((error: unknown) => {
        if (alive) setState({ kind: 'error', retry: 'load', message: error instanceof Error ? error.message : 'No se pudieron cargar los temas.' });
      });
    return () => { alive = false; };
  }, [materialId, reload]);

  async function detect() {
    if (detecting.current) return;
    detecting.current = true;
    setState({ kind: 'detecting' });
    try {
      const topics = await detectExamTopics(materialId);
      if (mounted.current) setState({ kind: 'ready', topics });
    } catch (error) {
      if (mounted.current) setState({ kind: 'error', retry: 'detect', message: error instanceof Error ? error.message : 'No se pudieron detectar los temas.' });
    } finally {
      detecting.current = false;
    }
  }

  function retry() {
    if (state.kind !== 'error') return;
    if (state.retry === 'detect') void detect();
    else { setState({ kind: 'loading' }); setReload((n) => n + 1); }
  }

  if (selected) {
    return <ExamIntro
      title="Examen por tema"
      subtitle={selected}
      materialId={materialId}
      kind="diagnostic"
      count="auto"
      topics={[selected]}
      onChangeTopic={() => setSelected(null)}
      points={[
        `Solo se evaluará «${selected}». Los demás temas quedan para otro examen.`,
        `La cantidad depende del contenido: puede ser menor de 8 y nunca mayor de ${MAX_EXAM_QUESTIONS}. No se añaden preguntas de relleno.`,
        'Después de cada respuesta verás si acertaste y por qué.',
        `Para cambiar el estado del tema se necesitan al menos ${MIN_QUESTIONS_PER_TOPIC} preguntas; se aprueba con ${PASS_MARK}% o más.`,
        'Un examen más corto también guarda tu resultado al terminar.',
      ]}
    />;
  }

  return (
    <Page eyebrow="MISHI / EXÁMENES" title="Un tema a la vez" subtitle={title}>
      <Card>
        <Text style={ui.sectionTitle}>¿Qué quieres practicar?</Text>
        <Text style={ui.body}>Elige un tema de este material. Mishi preparará las preguntas que su contenido permita; después puedes volver por los demás.</Text>
      </Card>
      {state.kind === 'loading' ? <LoadingCard title="Cargando temas…" /> : null}
      {state.kind === 'detecting' ? <LoadingCard title="Buscando temas en tus apuntes…" message="Mantén esta pantalla abierta hasta que termine." /> : null}
      {state.kind === 'error' ? <ErrorCard message={state.message} onRetry={retry} /> : null}
      {state.kind === 'ready' && state.topics.length === 0 ? (
        <Card>
          <Text style={ui.body}>Este material todavía no tiene temas detectados.</Text>
          <Button label="Detectar temas" icon="sparkles-outline" onPress={() => void detect()} />
        </Card>
      ) : null}
      {state.kind === 'ready' && state.topics.length > 0 ? <SectionHeading title="Elige un tema" /> : null}
      {state.kind === 'ready' ? state.topics.map((topic) => (
        <Button key={topic} label={topic} variant="secondary" icon="arrow-forward" onPress={() => setSelected(topic)} />
      )) : null}
      <Button label="Volver" variant="secondary" disabled={state.kind === 'detecting'} onPress={() => goBackOr('/examen')} />
    </Page>
  );
}
