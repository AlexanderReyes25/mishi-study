// Ayudas de formato del módulo de exámenes.

// Las opciones se muestran como texto normal (un WebView dentro de un botón
// no recibe bien los toques), así que quitamos los signos $ de LaTeX.
export function plainMath(text: string): string {
  return text.replace(/\${1,2}([^$]+)\${1,2}/g, '$1').trim();
}

export function percent(correct: number, total: number): number {
  return total > 0 ? Math.round((100 * correct) / total) : 0;
}
