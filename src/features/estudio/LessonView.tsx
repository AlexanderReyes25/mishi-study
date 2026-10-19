import { Text, View } from 'react-native';
import { MathView } from './MathView';
import { LessonBlock } from './lessonTypes';
import { colors, font, radius, spacing } from '../../theme';

export function LessonView({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'text':
            return (
              <Text key={i} style={{ fontSize: font.body, lineHeight: 24, color: colors.text }}>
                {b.content}
              </Text>
            );
          case 'formula':
            return <MathView key={i} latex={b.latex} />;
          case 'example':
            return (
              <View
                key={i}
                style={{
                  borderWidth: 2,
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  padding: spacing.lg,
                  gap: spacing.md,
                }}
              >
                <Text style={{ fontSize: font.subtitle, fontWeight: '700', color: colors.text }}>{b.title}</Text>
                {b.steps.map((s, j) => (
                  <View key={j} style={{ gap: spacing.xs }}>
                    <Text style={{ fontSize: font.body, color: colors.text }}>
                      {j + 1}. {s.text}
                    </Text>
                    {s.latex ? (
                      <View style={{ backgroundColor: colors.successSoft, borderRadius: radius.sm }}>
                        <MathView latex={s.latex} height={70} />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          case 'tip':
            return (
              <View
                key={i}
                style={{ backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.lg }}
              >
                <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.text }}>
                  Consejo: {b.content}
                </Text>
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}
