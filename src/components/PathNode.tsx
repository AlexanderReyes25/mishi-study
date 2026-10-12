// Nodo de la ruta de estudio (Resumen, Flashcards, Práctica, Examen).
// state: done (verde con visto), current (azul con play), locked (gris con candado)
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '../theme';

type State = 'done' | 'current' | 'locked';

const look = {
  done: { bg: colors.success, border: colors.successDark, icon: 'checkmark' as const, color: colors.primary },
  current: { bg: colors.primary, border: colors.primaryDark, icon: 'play' as const, color: colors.white },
  locked: { bg: colors.neutralSoft, border: colors.neutral, icon: 'lock-closed' as const, color: colors.textMuted },
};

type Props = { label: string; state: State; onPress?: () => void };

export function PathNode({ label, state, onPress }: Props) {
  const v = look[state];
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={state === 'locked' || !onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: state === 'locked' }}
        style={[styles.node, { backgroundColor: v.bg, borderColor: v.border }]}
      >
        <Ionicons name={v.icon} size={28} color={v.color} />
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  node: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: font.small, color: colors.text },
});
