import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

const tabs = [
  { name: 'index', title: 'Inicio', icon: 'home-outline' },
  { name: 'materiales', title: 'Materiales', icon: 'folder-open-outline' },
  { name: 'repaso', title: 'Repaso', icon: 'layers-outline' },
  { name: 'progreso', title: 'Progreso', icon: 'stats-chart-outline' },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // El espacio del navegador también debe abarcar el fondo del icono.
        // El padding de la versión anterior agotaba el ancho disponible en Android.
        tabBarIconStyle: styles.iconFrame,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          height: 60 + bottomPadding,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconFrame,
                  styles.iconBackground,
                  { backgroundColor: focused ? colors.successSoft : 'transparent' },
                ]}
              >
                <Ionicons name={tab.icon} color={color} size={23} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    width: 58,
    height: 30,
    flexShrink: 0,
  },
  iconBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});
