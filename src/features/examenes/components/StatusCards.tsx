// Tarjetas de carga y de error con reintento, usadas en todas las pantallas del examen.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { colors, font, spacing } from '../../../theme';

export function LoadingCard({ title, message }: { title: string; message?: string }) {
  return (
    <Card>
      <View style={styles.row} accessible accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={colors.primary} />
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Card>
  );
}

type ErrorProps = { message: string; onRetry?: () => void; retryLabel?: string; loading?: boolean };

export function ErrorCard({ message, onRetry, retryLabel = 'Reintentar', loading = false }: ErrorProps) {
  return (
    <Card>
      <View style={styles.row} accessible accessibilityRole="alert">
        <Ionicons name="alert-circle" size={font.title} color={colors.error} />
        <View style={styles.texts}>
          <Text style={[styles.title, { color: colors.error }]}>Algo salió mal</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} loading={loading} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: spacing.xs },
  title: { fontSize: font.body, fontWeight: '800', color: colors.text },
  message: { fontSize: font.body, color: colors.textMuted },
});
