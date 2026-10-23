// Muestra texto con matemáticas bien escritas, al estilo LaTeX.
// Entiende:
//   $...$      fórmula dentro de una frase
//   $$...$$    fórmula en su propia línea
//   **texto**  negrita
//   # Título    (hasta 3 niveles), listas con "- " y listas numeradas "1. "
// Seguridad: todo se arma con textContent y katex.render; el texto de la IA
// nunca se interpreta como HTML.
// Requiere: npx expo install react-native-webview   (y conexión a internet: KaTeX se carga de un CDN)
import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildHtml } from './mathDocument';

export function MathText({ text, color = '#2C4251' }: { text: string; color?: string }) {
  const [height, setHeight] = useState(24);
  const source = useMemo(() => ({ html: buildHtml(text, color) }), [text, color]);
  return (
    <WebView
      originWhitelist={['*']}
      source={source}
      scrollEnabled={false}
      style={{ height, backgroundColor: 'transparent' }}
      onMessage={(e) => {
        const h = Number(e.nativeEvent.data);
        if (h > 0) setHeight(h);
      }}
    />
  );
}

// Usa el WebView solo si el texto lo necesita; si no, un Text normal (más liviano).
export function RichText({ text, color = '#2C4251' }: { text: string; color?: string }) {
  const needsMath = /\$|\*\*|^#|^\s*[-*]\s/m.test(text);
  return needsMath ? (
    <MathText text={text} color={color} />
  ) : (
    <Text style={{ color, fontSize: 16, lineHeight: 24 }}>{text}</Text>
  );
}