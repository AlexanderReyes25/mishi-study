// MATERIALES — responsable: Parte 1 · Integrante 2.
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, font } from '../../theme';

export default function Materiales() {
  return (
    <Screen title="Materiales" subtitle="Parte 1 · Integrante 2">
      <Card>
        <Text style={{ color: colors.text, fontSize: font.body }}>
          Aquí van la lista de materiales y subir PDF, foto o texto. Carpeta: src/features/materiales
        </Text>
      </Card>
    </Screen>
  );
}
