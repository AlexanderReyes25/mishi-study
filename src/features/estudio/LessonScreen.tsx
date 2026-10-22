import { ScrollView, Text } from 'react-native';
import { LessonView } from './LessonView';
import { LessonBlock } from './lessonTypes';
import { sampleLesson } from './lessonSample';
import { colors, font, spacing } from '../../theme';

type Props = { title?: string; blocks?: LessonBlock[] };

// Sin props usa los datos de ejemplo. Cuando llegue el servidor v3 se pasan los bloques reales.
export function LessonScreen({ title = sampleLesson.title, blocks = sampleLesson.blocks }: Props) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={{ fontSize: font.title, fontWeight: '800', color: colors.text }}>{title}</Text>
      <LessonView blocks={blocks} />
    </ScrollView>
  );
}
