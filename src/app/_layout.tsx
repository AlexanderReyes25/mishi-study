// Raíz de la app: carga la sesión y decide qué se puede ver.
// Sin sesión solo existe (auth); con sesión, (tabs).
// Las pantallas de cada parte (estudio/, examen/...) se abren desde las pestañas.
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SessionProvider, useSession } from '../services/session';
import { colors } from '../theme';

function RootStack() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="estudio" />
        <Stack.Screen name="examen" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootStack />
    </SessionProvider>
  );
}
