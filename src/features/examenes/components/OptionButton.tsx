// Una opción de respuesta. Tras comprobar, el acierto y el fallo se marcan
// con color + ícono + etiqueta ("Correcta" / "Tu respuesta"), nunca solo con color.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing, touchMin } from '../../../theme';
import { RichText } from '../../../components/MathText';
import { plainMath } from '../format';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const look = {
  idle: { bg: colors.background, border: colors.neutral, text: colors.text, icon: 'ellipse-outline' as const, iconColor: colors.neutral },
  selected: { bg: colors.neutralSoft, border: colors.primary, text: colors.text, icon: 'radio-button-on' as const, iconColor: colors.primary },
  correct: { bg: colors.successSoft, border: colors.successDark, text: colors.text, icon: 'checkmark-circle' as const, iconColor: colors.successDark },
  wrong: { bg: colors.errorSoft, border: colors.error, text: colors.text, icon: 'close-circle' as const, iconColor: colors.error },
  dimmed: { bg: colors.background, border: colors.neutralSoft, text: colors.textMuted, icon: 'ellipse-outline' as const, iconColor: colors.neutral },
};

type Props = {
  label: string;
  state: OptionState;
  tags?: string[]; // "Correcta", "Tu respuesta"
  locked: boolean; // ya se comprobó: no se puede cambiar
  onPress: () => void;
};

export function OptionButton({ label, state, tags = [], locked, onPress }: Props) {
  const v = look[state];
  const text = plainMath(label);
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ checked: state === 'selected' || tags.includes('Tu respuesta'), disabled: locked }}
      accessibilityLabel={tags.length ? `${text}. ${tags.join(', ')}` : text}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !locked && styles.pressed,
      ]}
    >
      <Ionicons name={v.icon} size={font.title} color={v.iconColor} />
      <View style={styles.texts}>
        <View pointerEvents="none"><RichText text={label} color={v.text}/></View>
        {tags.length ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Text
                key={tag}
                style={[styles.tag, { color: state === 'wrong' ? colors.error : colors.primary, borderColor: v.border }]}
              >
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: spacing.xs / 2,
  },
  pressed: { opacity: 0.85 },
  texts: { flex: 1, gap: spacing.xs },
  label: { fontSize: font.body, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    fontSize: font.small,
    fontWeight: '800',
    borderWidth: spacing.xs / 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    overflow: 'hidden',
  },
});
