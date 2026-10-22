// Reevaluación de un tema después del refuerzo (6 preguntas solo de ese tema).
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { MIN_QUESTIONS_PER_TOPIC, PASS_MARK } from '../../services/progress';
import { ExamIntro } from '../../features/examenes/components/ExamIntro';
import { ErrorCard } from '../../features/examenes/components/StatusCards';
import { goBackOr } from '../../features/examenes/navigation';
import { firstParam } from '../../features/examenes/params';

const REEVALUATION_COUNT = 6;

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
      count={REEVALUATION_COUNT}
      topics={[topic]}
      points={[
        `Hasta ${REEVALUATION_COUNT} preguntas solo sobre «${topic}».`,
        `Apruebas el tema con ${PASS_MARK}% o más.`,
        `El tema necesita al menos ${MIN_QUESTIONS_PER_TOPIC} preguntas para cambiar de estado.`,
      ]}
    />
  );
}
