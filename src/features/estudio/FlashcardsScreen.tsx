import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { MathText } from '../../components/MathText';
import { Flashcard, getDueFlashcards, reviewFlashcard } from '../../services/study';
import { colors, font, radius, spacing } from '../../theme';

export function FlashcardsScreen({ materialId }: { materialId?: string }) {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);

  // Carga inicial: los setState ocurren dentro de callbacks, no de golpe en el efecto.
  useEffect(() => {
    let cancelled = false;
    getDueFlashcards(materialId)
      .then((cards) => {
        if (!cancelled) setQueue(cards);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message ?? 'Error al cargar las tarjetas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  // Botón "Volver a revisar" (se llama desde un evento, no desde un efecto).
  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setQueue(await getDueFlashcards(materialId));
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar las tarjetas');
    } finally {
      setLoading(false);
    }
  }

  async function answer(knew: boolean) {
    const card = queue[0];
    if (!card || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await reviewFlashcard(card, knew);
      setReviewed((n) => n + 1);
      // Sabía: sale de la sesión. No sabía: vuelve al final para repetirla hoy.
      setQueue((q) => (knew ? q.slice(1) : [...q.slice(1), updated]));
      setFlipped(false);
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  if (!queue.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ fontSize: font.subtitle, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          {reviewed ? 'Terminaste el repaso de hoy' : 'No tienes tarjetas para repasar'}
        </Text>
        {error ? <Text style={{ color: colors.error, fontSize: font.body }}>{error}</Text> : null}
        <View style={{ alignSelf: 'stretch' }}>
          <Button label="Volver a revisar" onPress={reload} />
        </View>
      </View>
    );
  }

  const card = queue[0];
  const content = flipped ? card.back : card.front;
  return (
    <View style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
      <Text style={{ color: colors.textMuted, fontSize: font.small }}>Quedan {queue.length}</Text>

      <Pressable
        onPress={() => setFlipped((f) => !f)}
        accessibilityRole="button"
        accessibilityLabel="Voltear tarjeta"
        style={{
          flex: 1,
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: radius.md,
          padding: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: font.small, color: colors.textMuted, marginBottom: spacing.sm }}>
          {flipped ? 'Respuesta' : 'Pregunta (toca para voltear)'}
        </Text>
        {/* Si la tarjeta lleva fórmulas ($...$), se dibujan con MathText */}
        {content.includes('$') ? (
          <View style={{ alignSelf: 'stretch' }}>
            <MathText text={content} color={colors.text} />
          </View>
        ) : (
          <Text style={{ fontSize: font.title, textAlign: 'center', color: colors.text }}>{content}</Text>
        )}
      </Pressable>

      {error ? <Text style={{ color: colors.error, fontSize: font.body }}>{error}</Text> : null}

      {flipped ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button label="No sabía" variant="danger" disabled={saving} onPress={() => answer(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Sabía" variant="success" disabled={saving} onPress={() => answer(true)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
