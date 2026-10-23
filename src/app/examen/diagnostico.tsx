// Introducción del examen diagnóstico de un material (8 preguntas).
import { useLocalSearchParams } from 'expo-router';
import { Page as Screen } from '../../components/MishiUI';
import { Button } from '../../components/Button';
import { PASS_MARK } from '../../services/progress';
import { ExamIntro } from '../../features/examenes/components/ExamIntro';
import { ErrorCard } from '../../features/examenes/components/StatusCards';
import { goBackOr } from '../../features/examenes/navigation';
import { firstParam } from '../../features/examenes/params';

const DIAGNOSTIC_COUNT = 8;

export default function Diagnostico() {
  const params = useLocalSearchParams<{ materialId?: string; title?: string }>();
  const materialId = firstParam(params.materialId);
  const title = firstParam(params.title);

  if (!materialId) {
    return (
      <Screen title="Examen diagnóstico">
        <ErrorCard message="No se indicó el material. Vuelve a la lista y elige uno." />
        <Button label="Ver mis materiales" onPress={() => goBackOr('/examen')} />
      </Screen>
    );
  }

  return (
    <ExamIntro
      title="Examen diagnóstico"
      subtitle={title || 'Tu material'}
      materialId={materialId}
      kind="diagnostic"
      count={DIAGNOSTIC_COUNT}
      points={[
        `Hasta ${DIAGNOSTIC_COUNT} preguntas de opción múltiple y verdadero o falso.`,
        'Después de cada respuesta verás si acertaste y por qué.',
        `Cada tema se aprueba con ${PASS_MARK}% o más; los demás pasan a refuerzo.`,
        'Tus respuestas se guardan solo al terminar el examen.',
      ]}
    />
  );
}
