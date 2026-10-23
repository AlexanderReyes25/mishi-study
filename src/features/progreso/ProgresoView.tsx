import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BusyLine, EmptyState, IconButton, IconTile, Notice, Page, SectionHeading, Tag, ui } from '../../components/MishiUI';
import type { Dashboard } from '../../services/dashboard';
import { colors, font, radius, spacing, touchMin } from '../../theme';
import { evaluationDate, filterProgress, masteryValue, progressFilters, summarizeProgress, type ProgressFilter } from './progressSummary';

type Props = { data: Dashboard | null; error?: string; loading?: boolean; onRefresh: () => void; onStudy: () => void; onReview?: () => void };
export function ProgresoView({ data, error, loading = false, onRefresh, onStudy, onReview }: Props) {
  const [filter, setFilter] = useState<ProgressFilter>('all');
  const [search, setSearch] = useState('');
  const summary = summarizeProgress(data?.topics ?? []);
  const visible = filterProgress(data?.topics ?? [], filter, search);
  return <Page eyebrow="MISHI / TU CAMINO" title="Cada paso cuenta" subtitle="Mira lo que has construido y encuentra tu siguiente paso."
    action={<IconButton icon="refresh-outline" light label="Actualizar progreso" disabled={loading} onPress={onRefresh} />}>
    {error ? <><Notice text={data ? `${error} Se muestran los últimos datos consultados.` : error} error /><Button label="Reintentar" disabled={loading} onPress={onRefresh} /></> : null}
    {loading || (!data && !error) ? <BusyLine text={data ? 'Actualizando tu recorrido…' : 'Reuniendo tu actividad…'} /> : null}
    {data ? <>
      <View style={[ui.row, { flexWrap: 'wrap' }]}>{[
        { n: data.materials, label: 'Materiales', icon: 'folder-open-outline' as const },
        { n: data.lessons, label: 'Lecciones', icon: 'book-outline' as const },
        { n: data.cards, label: 'Tarjetas', icon: 'layers-outline' as const },
      ].map(item => <View key={item.label} style={styles.metric}><IconTile icon={item.icon} small tone="coral" /><Text style={styles.number}>{item.n}</Text><Text style={ui.caption}>{item.label}</Text></View>)}</View>

      {summary.evaluated > 0 ? <>
        <Card><View style={ui.headingRow}><Text style={ui.sectionTitle}>Tu aprendizaje, hasta hoy</Text><IconTile icon="leaf-outline" small tone="lime" /></View>
          <Text style={styles.number}>{summary.approved}<Text style={styles.denominator}> / {summary.evaluated} temas</Text></Text>
          <Text style={ui.body}>Con buen avance en las evaluaciones.</Text>
          <View style={ui.wrap}><Tag label={`${summary.reinforcing} a reforzar`} tone="coral" /><Tag label={`${summary.pending} en curso`} /></View>
          <Text style={ui.caption}>{summary.correct} aciertos de {summary.attempts} respuestas evaluadas · {summary.accuracy}% de aciertos acumulados.</Text>
        </Card>
        <Card style={styles.nextCard}><Tag label="TU SIGUIENTE PASO" tone="success" /><Text style={ui.sectionTitle}>{summary.next?.topic ?? 'Dale continuidad a lo aprendido'}</Text>
          <Text style={ui.body}>{summary.next ? 'Este tema merece otra vuelta. Repasa su lección y practica antes de la próxima evaluación.' : 'Tus temas evaluados muestran buen avance. Repasa tus tarjetas o empieza con un material nuevo.'}</Text>
          <Button label="Ir a Repaso" icon="layers-outline" onPress={onReview ?? onStudy} />
        </Card>
      </> : null}

      <SectionHeading title="Tu mapa de aprendizaje" detail={`${data.topics.length} temas`} />
      {data.topics.length ? <>
        <TextInput accessibilityLabel="Buscar tema o materia" placeholder="Buscar tema o materia…" placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} style={ui.field} />
        <View style={ui.wrap}>{progressFilters.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[styles.filter, filter === item.id && styles.filterActive]}><Text style={[styles.filterText, filter === item.id && { color: colors.white }]}>{item.label}</Text></Pressable>)}</View>
        {visible.map(topic => {
          const value = masteryValue(topic.mastery), date = evaluationDate(topic.last_evaluated_at);
          const label = topic.status === 'approved' ? 'Buen avance' : topic.status === 'reinforcing' ? 'A reforzar' : 'En curso';
          return <Card key={topic.id}>
            <View style={[ui.headingRow, { alignItems: 'flex-start', flexWrap: 'wrap' }]}><Text style={[ui.label, { flexGrow: 1, flexBasis: 160 }]}>{topic.topic}</Text><Tag label={label} tone={topic.status === 'approved' ? 'success' : 'coral'} /></View>
            {topic.subjects?.name ? <Text style={ui.caption}>{topic.subjects.name}</Text> : null}
            {topic.attempts > 0 ? <>
              <View accessibilityRole="progressbar" accessibilityLabel={`Dominio estimado de ${topic.topic}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }} style={styles.track}><View style={[styles.fill, { width: `${value}%`, backgroundColor: topic.status === 'approved' ? colors.success : colors.accent }]} /></View>
              <View style={[ui.headingRow, { flexWrap: 'wrap' }]}><Text style={ui.caption}>Dominio estimado{topic.status === 'pending' ? ' · provisional' : ''}</Text><Text style={ui.label}>{Math.round(value)}%</Text></View>
              <Text style={ui.caption}>{topic.correct} aciertos · {topic.attempts} respuestas evaluadas</Text>
            </> : <Text style={ui.caption}>Todavía no hay respuestas evaluadas para este tema.</Text>}
            {date ? <Text style={ui.caption}>Última evaluación: {date}</Text> : null}
          </Card>;
        })}
        {!visible.length ? <EmptyState icon="search-outline" title="Sin coincidencias" description="Prueba con otro tema, materia o estado."><Button label="Mostrar todos los temas" variant="secondary" onPress={() => { setSearch(''); setFilter('all'); }} /></EmptyState> : null}
      </> : <EmptyState icon="trail-sign-outline" title="Tu recorrido apenas comienza" description="Cuando completes evaluaciones, aquí verás tus avances por tema. Tus materiales y lecciones ya cuentan arriba."><Button label="Elegir algo para estudiar" onPress={onStudy} /></EmptyState>}

      <View style={styles.explanation}><Text style={ui.label}>¿Cómo se interpreta?</Text><Text style={ui.caption}>En curso: faltan respuestas para clasificar el tema. A reforzar: conviene seguir practicando. Buen avance: se alcanzó el criterio de la evaluación.</Text><Text style={ui.caption}>El dominio combina tus evaluaciones recientes; no es una nota oficial ni equivale al porcentaje de aciertos acumulados. La práctica libre de procedimientos y las tarjetas no modifican este porcentaje.</Text></View>
    </> : null}
  </Page>;
}
const styles = StyleSheet.create({
  metric: { flex: 1, minWidth: 85, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.line },
  number: { fontSize: font.big, fontWeight: '800', color: colors.primaryDark }, denominator: { fontSize: font.body, fontWeight: '500', color: colors.textMuted },
  nextCard: { backgroundColor: colors.successSoft },
  filter: { minHeight: touchMin, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  track: { height: spacing.sm, backgroundColor: colors.neutralSoft, borderRadius: radius.pill, overflow: 'hidden' }, fill: { height: spacing.sm },
  explanation: { padding: spacing.lg, gap: spacing.sm },
});
