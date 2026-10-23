import { useLocalSearchParams } from 'expo-router';
import { FlashcardsScreen } from '../../features/estudio/FlashcardsScreen';
import { useSession } from '../../services/session';

export default function FlashcardsRoute() {
  const { materialId } = useLocalSearchParams<{ materialId?: string | string[] }>();
  const { userId } = useSession();
  const selected = typeof materialId === 'string' && materialId ? materialId : undefined;
  return <FlashcardsScreen key={JSON.stringify([userId, selected])} materialId={selected} />;
}
