import { Text, View } from 'react-native';
import { MathText, RichText } from '../../components/MathText';
import { LessonBlock } from './lessonTypes';
import { colors, font, radius, spacing } from '../../theme';

export function LessonView({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'text':
            return <RichText key={i} text={b.content} color={colors.text} />;
          case 'formula':
            return <MathText key={i} text={`$$${b.latex}$$`} color={colors.text} />;
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
                    {/* Si la IA ya numeró el paso ("1. ..."), se quita para no duplicar el número */}
                    <RichText text={`${j + 1}. ${s.text.replace(/^\s*\d+[.)]\s+/, '')}`} color={colors.text} />
                    {s.latex ? (
                      <View
                        style={{
                          backgroundColor: colors.successSoft,
                          borderRadius: radius.sm,
                          paddingHorizontal: spacing.sm,
                        }}
                      >
                        <MathText text={`$$${s.latex}$$`} color={colors.text} />
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
                <RichText text={`Consejo: ${b.content}`} color={colors.text} />
              </View>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}
