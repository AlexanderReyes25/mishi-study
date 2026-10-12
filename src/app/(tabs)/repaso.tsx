// REPASO — responsable: Parte 2 · Integrante 3.
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, font } from '../../theme';

export default function Repaso() {
  return (
    <Screen title="Repaso" subtitle="Parte 2 · Integrante 3">
      <Card>
        <Text style={{ color: colors.text, fontSize: font.body }}>
          Aquí van las flashcards con repaso y el acceso a las lecciones. Carpeta: src/features/estudio
        </Text>
      </Card>
    </Screen>
  );
}
