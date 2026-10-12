// Las cuatro pestañas de la app. Cada archivo de esta carpeta es una pantalla.
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: font.small - 2 },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="materiales"
        options={{ title: 'Materiales', tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="repaso"
        options={{ title: 'Repaso', tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="progreso"
        options={{ title: 'Progreso', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
