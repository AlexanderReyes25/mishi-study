import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function EstudioLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="flashcards" options={{ title: 'Flashcards' }} />
      <Stack.Screen name="leccion" options={{ title: 'Lección' }} />
    </Stack>
  );
}
