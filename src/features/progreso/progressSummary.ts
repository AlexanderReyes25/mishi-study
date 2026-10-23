import type { ProgressTopic } from '../../services/dashboard';

export type ProgressFilter = 'all' | ProgressTopic['status'];
export const progressFilters: { id: ProgressFilter; label: string }[] = [
  { id: 'all', label: 'Todos' }, { id: 'reinforcing', label: 'A reforzar' },
  { id: 'pending', label: 'En curso' }, { id: 'approved', label: 'Buen avance' },
];
export const masteryValue = (value: number) => Math.max(0, Math.min(100, Number(value) || 0));
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

export function summarizeProgress(topics: ProgressTopic[]) {
  const evaluated = topics.filter(topic => topic.attempts > 0);
  const attempts = evaluated.reduce((sum, topic) => sum + topic.attempts, 0);
  const correct = evaluated.reduce((sum, topic) => sum + topic.correct, 0);
  const reinforcing = evaluated.filter(topic => topic.status === 'reinforcing');
  const pending = evaluated.filter(topic => topic.status === 'pending');
  const next = [...reinforcing, ...pending].sort((a, b) => {
    const priority = Number(b.status === 'reinforcing') - Number(a.status === 'reinforcing');
    return priority || masteryValue(a.mastery) - masteryValue(b.mastery) || a.topic.localeCompare(b.topic);
  })[0];
  return {
    evaluated: evaluated.length, approved: evaluated.filter(topic => topic.status === 'approved').length,
    reinforcing: reinforcing.length, pending: pending.length, attempts, correct,
    accuracy: attempts ? Math.round(100 * correct / attempts) : null, next,
  };
}

export function filterProgress(topics: ProgressTopic[], filter: ProgressFilter, search: string) {
  const query = normalize(search);
  return topics.filter(topic => (filter === 'all' || topic.status === filter)
    && normalize(`${topic.topic} ${topic.subjects?.name ?? ''}`).includes(query))
    .sort((a, b) => (b.last_evaluated_at ?? '').localeCompare(a.last_evaluated_at ?? '') || a.topic.localeCompare(b.topic));
}

export function evaluationDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
}
