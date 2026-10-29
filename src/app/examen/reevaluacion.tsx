// Reevaluación de un tema: la cantidad depende del material disponible.
import { useLocalSearchParams } from 'expo-router';
import { Page as Screen } from '../../components/MishiUI';
import { Button } from '../../components/Button';
import { MIN_QUESTIONS_PER_TOPIC, PASS_MARK } from '../../services/progress';
import { ExamIntro } from '../../features/examenes/components/ExamIntro';
import { ErrorCard } from '../../features/examenes/components/StatusCards';
import { goBackOr } from '../../features/examenes/navigation';
import { firstParam } from '../../features/examenes/params';
import { MAX_EXAM_QUESTIONS } from '../../../supabase/functions/_shared/exam';

export default function Reevaluacion() {
  const params = useLocalSearchParams<{ materialId?: string; topic?: string }>();
  const materialId = firstParam(params.materialId);
  const topic = firstParam(params.topic);

  if (!materialId || !topic) {
    return (
      <Screen title="Reevaluación">
        <ErrorCard message="Falta el material o el tema. Vuelve a los resultados y elige un tema." />
        <Button label="Ver mis materiales" onPress={() => goBackOr('/examen')} />
      </Screen>
    );
  }

  return (
    <ExamIntro
      title="Reevaluación"
      subtitle={topic}
      materialId={materialId}
      kind="reevaluation"
      count="auto"
      topics={[topic]}
      points={[
        `Solo sobre «${topic}». La IA elige la cantidad según el contenido, sin mínimo y con un máximo de ${MAX_EXAM_QUESTIONS}.`,
        `Apruebas el tema con ${PASS_MARK}% o más.`,
        `El tema necesita al menos ${MIN_QUESTIONS_PER_TOPIC} preguntas para cambiar de estado.`,
        'Si el examen es más corto, tu resultado se guarda sin cambiar el estado del tema.',
      ]}
    />
  );
}
