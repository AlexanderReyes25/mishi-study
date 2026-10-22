// EXÁMENES Y REFUERZO — responsable: Pablo (Parte 3 · Integrante 4).
// Comparte el examen en curso entre las pantallas de esta carpeta.
// El layout raíz no protege esta ruta, así que aquí se exige sesión.
import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../services/session';
import { ExamProvider } from '../../features/examenes/ExamProvider';

export default function ExamenLayout() {
  const { session, loading } = useSession();
  if (loading) return null; // la raíz ya muestra la carga
  if (!session) return <Redirect href="/login" />;

  return (
    <ExamProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ExamProvider>
  );
}
