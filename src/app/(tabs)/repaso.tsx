// REPASO — responsable: Parte 2 · Integrante 3.
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { colors, font, radius, spacing, touchMin } from '../../theme';
import { getDueCount } from '../../services/study';
import { seedTestFlashcards } from '../../features/estudio/devSeed';

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

  async function seed() {
    try {
      await seedTestFlashcards();
      await refresh();
    } catch (e: any) {
      setMessage(e.message ?? 'No se pudieron crear las tarjetas de prueba');
    }
  }

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
            <Pressable
              onPress={() => router.push('/estudio/flashcards')}
              accessibilityRole="button"
              style={botonPrimario}
            >
              <Text style={textoBoton}>Repasar ahora</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: font.subtitle, fontWeight: '700' }}>Lección de ejemplo</Text>
            <Text style={{ color: colors.text, fontSize: font.body }}>
              Lección con fórmulas dibujadas. Por ahora usa datos de ejemplo hasta que llegue el servidor versión 3.
            </Text>
            <Pressable
              onPress={() => router.push('/estudio/leccion')}
              accessibilityRole="button"
              style={botonPrimario}
            >
              <Text style={textoBoton}>Abrir lección</Text>
            </Pressable>
          </View>
        </Card>

        {__DEV__ ? (
          <Pressable onPress={seed} accessibilityRole="button" style={botonSecundario}>
            <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>
              Solo pruebas: crear 4 tarjetas
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const botonPrimario = {
  minHeight: touchMin,
  backgroundColor: colors.primary,
  borderRadius: radius.md,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  paddingHorizontal: spacing.lg,
};
const botonSecundario = {
  minHeight: touchMin,
  borderWidth: 2,
  borderColor: colors.border,
  borderRadius: radius.md,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  paddingHorizontal: spacing.lg,
};
const textoBoton = { color: colors.white, fontSize: font.body, fontWeight: '700' as const };
