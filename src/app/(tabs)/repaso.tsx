// REPASO — responsable: Parte 2 · Integrante 3.
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { colors, font, spacing } from '../../theme';
import { getDueCount } from '../../services/study';

export default function Repaso() {
  const router = useRouter();
  const [due, setDue] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDue(await getDueCount());
      setMessage(null);
    } catch (e: any) {
      setMessage(e.message ?? 'No se pudo cargar el repaso');
    }
  }, []);

  // Se actualiza cada vez que vuelves a esta pestaña
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Screen title="Repaso" subtitle="Parte 2 · Integrante 3">
      <View style={{ gap: spacing.lg }}>
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: font.subtitle, fontWeight: '700' }}>Flashcards de hoy</Text>
            <Text style={{ color: colors.text, fontSize: font.body }}>
              {due === null
                ? 'Cargando…'
                : due === 0
                  ? 'No tienes tarjetas por repasar ahora.'
                  : `Tienes ${due} ${due === 1 ? 'tarjeta' : 'tarjetas'} por repasar.`}
            </Text>
            {message ? <Text style={{ color: colors.error, fontSize: font.body }}>{message}</Text> : null}
            <Button label="Repasar ahora" onPress={() => router.push('/estudio/flashcards')} />
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: font.subtitle, fontWeight: '700' }}>Lección de ejemplo</Text>
            <Text style={{ color: colors.text, fontSize: font.body }}>
              Lección con fórmulas dibujadas. Por ahora usa datos de ejemplo hasta que llegue el servidor versión 3.
            </Text>
            <Button label="Abrir lección" onPress={() => router.push('/estudio/leccion')} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
