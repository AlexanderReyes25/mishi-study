import { PracticaScreen } from '../../features/practica/PracticaScreen';
import { useSession } from '../../services/session';
export default function PracticaRoute() { const {userId}=useSession();return userId ? <PracticaScreen key={userId}/> : null; }
