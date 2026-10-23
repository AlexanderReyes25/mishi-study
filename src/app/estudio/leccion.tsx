import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { LeccionConectada } from '../../features/estudio/LeccionConectada';
import { useSession } from '../../services/session';
import { colors, spacing } from '../../theme';

export default function LeccionRoute() {
  const { materialId, topic } = useLocalSearchParams<{ materialId?: string | string[]; topic?: string | string[] }>();
  const { userId } = useSession();
  if (!userId || typeof materialId !== 'string' || !materialId || typeof topic !== 'string' || !topic.trim()) {
    return <Text style={{ padding: spacing.lg, color: colors.text }}>Abre una lección desde Materiales o Repaso.</Text>;
  }
  return <LeccionConectada key={JSON.stringify([userId, materialId, topic])} userId={userId} materialId={materialId} topic={topic} />;
}
