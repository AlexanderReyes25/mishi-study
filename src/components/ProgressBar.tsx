// Barra de progreso. value va de 0 a 100.
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.neutralSoft, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.success },
});
