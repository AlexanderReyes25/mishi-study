import { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, font } from '../../theme';

const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';

type Props = { latex: string; height?: number };

export function MathView({ latex, height = 120 }: Props) {
  const [failed, setFailed] = useState(false);

  // Si no hay internet o falla la carga, se muestra el texto de la fórmula
  // en vez de romper la pantalla.
  if (failed) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: font.body, fontFamily: 'monospace' }}>{latex}</Text>
      </View>
    );
  }

  // el < se escapa para que una fórmula nunca pueda cerrar la etiqueta script
  const safe = JSON.stringify(latex).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><head>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<link rel='stylesheet' href='${KATEX}katex.min.css'>
<script src='${KATEX}katex.min.js'></script></head>
<body style='margin:0;display:flex;align-items:center;justify-content:center;color:${colors.text}'>
<div id='m'></div>
<script>katex.render(${safe}, document.getElementById('m'), { displayMode: true, throwOnError: false, errorColor: '${colors.error}' });</script>
</body></html>`;

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      scrollEnabled={false}
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
      style={{ height, backgroundColor: 'transparent' }}
    />
  );
}
