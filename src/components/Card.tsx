// Tarjeta con borde: agrupa contenido relacionado.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
