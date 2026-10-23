// EXÁMENES Y REFUERZO — responsable: Pablo (Parte 3 · Integrante 4).
// Comparte el examen en curso entre las pantallas de esta carpeta.
// La raíz y este layout requieren sesión; el estado se aísla por usuario.
import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../services/session';
import { ExamProvider } from '../../features/examenes/ExamProvider';

export default function ExamenLayout() {
  const { session, loading } = useSession();
  if (loading) return null; // la raíz ya muestra la carga
  if (!session) return <Redirect href="/login" />;

  return (
    <ExamProvider key={session.user.id}>
      <Stack screenOptions={{ headerShown: false }} />
    </ExamProvider>
  );
}
