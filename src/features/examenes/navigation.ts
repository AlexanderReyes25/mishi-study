// Volver atrás sin quedarse atascado si la pantalla se abrió directamente (enlace).
import { router, type Href } from 'expo-router';

export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
