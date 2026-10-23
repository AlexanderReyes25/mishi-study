import { MaterialesScreen } from '../../features/materiales/MaterialesScreen';
import { useSession } from '../../services/session';

export default function MaterialesRoute() {
  const { userId } = useSession();
  return userId ? <MaterialesScreen key={userId} userId={userId} /> : null;
}
