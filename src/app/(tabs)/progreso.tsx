import { router } from 'expo-router';
import { ProgresoScreen } from '../../features/progreso/ProgresoScreen';
import { useSession } from '../../services/session';

export default function Progreso() {
  const { userId } = useSession();
  return userId ? <ProgresoScreen key={userId} userId={userId}
    onStudy={() => router.navigate('/(tabs)/materiales')}
    onReview={() => router.navigate('/(tabs)/repaso')} /> : null;
}
