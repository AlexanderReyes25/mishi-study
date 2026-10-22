// Panel inferior fijo con la retroalimentación inmediata:
// VERDE si acierta, CORAL si falla; siempre con ícono y texto, no solo color.
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/Button';
import { RichText } from '../../../components/MathText';
import type { GradedAnswer } from '../../../services/exams';
import { colors, font, radius, spacing } from '../../../theme';
import { plainMath } from '../format';

type Props = {
  answer: GradedAnswer;
  isLast: boolean;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
};

export function FeedbackPanel({ answer, isLast, busy, error, onContinue }: Props) {
  const { height } = useWindowDimensions();
  const ok = answer.isCorrect;
  const tone = ok
    ? { strip: colors.success, stripText: colors.primary, soft: colors.successSoft, border: colors.successDark }
    : { strip: colors.accent, stripText: colors.white, soft: colors.errorSoft, border: colors.accent };

  return (
    <View style={[styles.panel, { backgroundColor: tone.soft, borderColor: tone.border }]}>
      <View
        style={[styles.strip, { backgroundColor: tone.strip }]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={ok ? '¡Correcto!' : `Incorrecto. La respuesta correcta es ${plainMath(answer.correctAnswer)}`}
      >
        <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={font.title} color={tone.stripText} />
        <Text style={[styles.stripText, { color: tone.stripText }]}>{ok ? '¡Correcto!' : 'Incorrecto'}</Text>
      </View>

      <ScrollView style={{ maxHeight: height * 0.3 }} contentContainerStyle={styles.body}>
        {!ok ? (
          <Text style={styles.answer}>
            Respuesta correcta: <Text style={styles.answerStrong}>{plainMath(answer.correctAnswer)}</Text>
          </Text>
        ) : null}
        {answer.explanation ? <RichText text={answer.explanation} color={colors.text} /> : null}
      </ScrollView>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button
        label={isLast ? (error ? 'Reintentar guardar' : 'Ver resultados') : 'Continuar'}
        variant={ok ? 'success' : 'primary'}
        onPress={onContinue}
        loading={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: spacing.xs,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stripText: { fontSize: font.subtitle, fontWeight: '800' },
  body: { gap: spacing.sm },
  answer: { fontSize: font.body, color: colors.text },
  answerStrong: { fontWeight: '800' },
  error: { fontSize: font.small, color: colors.error, fontWeight: '600' },
});
