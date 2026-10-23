import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getDashboard, type Dashboard } from '../../services/dashboard';
import { ProgresoView } from './ProgresoView';

export function ProgresoScreen({ userId, onStudy, onReview }: { userId: string; onStudy: () => void; onReview: () => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    busy.current = true;
    setLoading(true);
    setError('');
    getDashboard(userId, controller.signal).then(value => {
      if (active) setData(value);
    }).catch((e: unknown) => {
      if (active) setError(controller.signal.aborted
        ? 'La consulta tardó demasiado. Revisa tu conexión y vuelve a intentar.'
        : e instanceof Error ? e.message : 'No se pudo cargar el progreso.');
    }).finally(() => {
      clearTimeout(timeout);
      if (active) { busy.current = false; setLoading(false); }
    });
    return () => { active = false; busy.current = false; clearTimeout(timeout); controller.abort(); };
    // attempt representa una recarga explícita del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attempt]));

  function refresh() {
    if (busy.current) return;
    busy.current = true;
    setAttempt(value => value + 1);
  }
  return <ProgresoView data={data} error={error} loading={loading} onRefresh={refresh} onStudy={onStudy} onReview={onReview} />;
}
