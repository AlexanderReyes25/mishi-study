// PROGRESO — responsable: Suar.
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, font } from '../../theme';

export default function Progreso() {
  return (
    <Screen title="Progreso" subtitle="Suar">
      <Card>
        <Text style={{ color: colors.text, fontSize: font.body }}>
          Aquí irá el dominio por tema y materia y las estadísticas.
        </Text>
      </Card>
    </Screen>
  );
}
