// Resultado de un tema en el examen: correctas/total, %, barra y estado.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ProgressBar } from '../../../components/ProgressBar';
import { MIN_QUESTIONS_PER_TOPIC, PASS_MARK, type TopicStatus } from '../../../services/progress';
import { colors, font, radius, spacing } from '../../../theme';
import { percent } from '../format';

type Props = {
  topic: string;
  correct: number;
  total: number;
  status: TopicStatus | undefined; // estado guardado en topic_progress
  onReinforce: () => void;
};

type Badge = { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string; iconColor: string };

const badges: Record<TopicStatus['status'], Badge> = {
  approved: { label: 'Aprobado', icon: 'checkmark-circle', bg: colors.successSoft, color: colors.primary, iconColor: colors.successDark },
  reinforcing: { label: 'En refuerzo', icon: 'refresh-circle', bg: colors.errorSoft, color: colors.error, iconColor: colors.error },
  pending: { label: 'Pendiente', icon: 'time', bg: colors.neutralSoft, color: colors.textMuted, iconColor: colors.textMuted },
};

export function TopicResultCard({ topic, correct, total, status, onReinforce }: Props) {
  const pct = percent(correct, total);
  const fewQuestions = total < MIN_QUESTIONS_PER_TOPIC;
  // Resultado de este examen: aprobado con PASS_MARK % o más
  const shown: Badge[] = [pct >= PASS_MARK ? badges.approved : badges.reinforcing];
  if (fewQuestions) shown.push(badges.pending);
  // Se puede reforzar si falló aquí o si el tema sigue en refuerzo en topic_progress
  const canReinforce = pct < PASS_MARK || status?.status === 'reinforcing';

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.topic}>{topic}</Text>
        {shown.map((badge) => (
          <View key={badge.label} style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={font.subtitle} color={badge.iconColor} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.score}>
        {correct} de {total} correctas · {pct}%
      </Text>
      <ProgressBar value={pct} />
      {fewQuestions ? (
        <View style={styles.note}>
          <Ionicons name="information-circle" size={font.subtitle} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Pendiente: este tema tuvo menos de {MIN_QUESTIONS_PER_TOPIC} preguntas, así que este examen no cambia su estado.
          </Text>
        </View>
      ) : null}
      {status ? (
        <Text style={styles.mastery}>
          Estado guardado: {badges[status.status].label} · dominio acumulado {Math.round(status.mastery)}%
        </Text>
      ) : null}
      {canReinforce ? <Button label="Reforzar este tema" onPress={onReinforce} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  topic: { flexShrink: 1, fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: font.small, fontWeight: '800' },
  score: { fontSize: font.body, color: colors.text },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: font.small, color: colors.textMuted },
  mastery: { fontSize: font.small, color: colors.textMuted },
});
