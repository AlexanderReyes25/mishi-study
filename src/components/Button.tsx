// Botón estándar. Alto mínimo de 52 px (cumple los 48 px de accesibilidad).
// variant: primary (azul), secondary (borde), success (verde lima), danger (error)
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'success' | 'danger';

const look = {
  primary: { bg: colors.primary, border: colors.primaryDark, text: colors.white },
  secondary: { bg: colors.background, border: colors.neutral, text: colors.primary },
  success: { bg: colors.success, border: colors.successDark, text: colors.primary },
  danger: { bg: colors.error, border: colors.errorDark, text: colors.white },
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false }: Props) {
  const v = look[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        off && styles.off,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  off: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { fontSize: font.body, fontWeight: '800' },
});
