import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'accent';
const look = {
  primary: { bg: colors.primary, border: colors.primary, text: colors.white },
  secondary: { bg: colors.white, border: colors.line, text: colors.primary },
  success: { bg: colors.success, border: colors.success, text: colors.primaryDark },
  danger: { bg: colors.errorSoft, border: colors.errorSoft, text: colors.error },
  accent: { bg: colors.accent, border: colors.accent, text: colors.primaryDark },
};
type Props = { label: string; onPress: () => void; variant?: Variant; disabled?: boolean; loading?: boolean; icon?: ComponentProps<typeof Ionicons>['name'] };
export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, icon }: Props) {
  const v = look[variant], off = disabled || loading;
  return <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off, busy: loading }}
    style={({ pressed }) => [styles.base, { backgroundColor: v.bg, borderColor: v.border }, off && styles.off, pressed && styles.pressed]}>
    {loading ? <ActivityIndicator color={v.text} /> : <>{icon ? <Ionicons name={icon} size={20} color={v.text} /> : null}<Text style={[styles.text, { color: v.text }]}>{label}</Text></>}
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  text: { fontSize: font.body, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  off: { opacity: 0.45 }, pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
