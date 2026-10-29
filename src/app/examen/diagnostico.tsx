// Selección de un tema antes de generar su examen.
import { useLocalSearchParams } from 'expo-router';
import { Page as Screen } from '../../components/MishiUI';
import { Button } from '../../components/Button';
import { ExamTopicSelection } from '../../features/examenes/components/ExamTopicSelection';
import { ErrorCard } from '../../features/examenes/components/StatusCards';
import { goBackOr } from '../../features/examenes/navigation';
import { firstParam } from '../../features/examenes/params';

export default function Diagnostico() {
  const params = useLocalSearchParams<{ materialId?: string; title?: string }>();
  const materialId = firstParam(params.materialId);
  const title = firstParam(params.title);

  if (!materialId) {
    return (
      <Screen title="Examen por tema">
        <ErrorCard message="No se indicó el material. Vuelve a la lista y elige uno." />
        <Button label="Ver mis materiales" onPress={() => goBackOr('/examen')} />
      </Screen>
    );
  }

  return <ExamTopicSelection key={materialId} materialId={materialId} title={title || 'Tu material'} />;
}
