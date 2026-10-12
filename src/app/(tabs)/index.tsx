// INICIO — responsable: Suar.
// Aquí irán las materias ordenadas por prioridad y la ruta de nodos.
// Por ahora: marcador de posición, la sombra de Mishi asomando abajo a la izquierda
// y un botón para cerrar sesión (solo desarrollo).
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MishiShadow } from '../../components/Mishi';
import { supabase } from '../../services/supabase';
import { useSession } from '../../services/session';
import { colors, font } from '../../theme';

export default function Inicio() {
  const { session } = useSession();
  return (
    <Screen
      title="Mishi Study"
      subtitle="Tu tutor de estudio con IA"
      overlay={<MishiShadow />}
    >
      <Card>
        <Text style={{ color: colors.text, fontSize: font.body }}>
          Sesión: {session?.user.email}
        </Text>
        <Button label="Cerrar sesión" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </Card>
    </Screen>
  );
}
