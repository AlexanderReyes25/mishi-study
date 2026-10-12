// Contenedor estándar de pantalla: zona segura, título y desplazamiento.
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, spacing } from '../theme';

// overlay: adorno que se dibuja encima del contenido, sin recibir toques (por ejemplo MishiShadow)
type Props = { title?: string; subtitle?: string; scroll?: boolean; overlay?: ReactNode; children: ReactNode };

export function Screen({ title, subtitle, scroll = true, overlay, children }: Props) {
  const body = (
    <>
      {title ? (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </>
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={styles.content}>{body}</View>
      )}
      {overlay ? (
        <View pointerEvents="none" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
});
