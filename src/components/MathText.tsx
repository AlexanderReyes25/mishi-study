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

const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';

// Mini renderizador que corre dentro del WebView.
// String.raw conserva las barras invertidas tal como están escritas.
const SCRIPT = String.raw`
function addMath(parent, tex, display) {
  var el = document.createElement(display ? 'div' : 'span');
  try {
    katex.render(tex, el, { displayMode: display, throwOnError: false });
  } catch (e) {
    el.textContent = tex;
  }
  parent.appendChild(el);
}

function addInline(parent, text) {
  var re = /(\$[^$\n]+\$|\*\*[^*]+\*\*)/g;
  var last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    var t = m[0];
    if (t.charAt(0) === '$') {
      addMath(parent, t.slice(1, -1), false);
    } else {
      var b = document.createElement('strong');
      b.textContent = t.slice(2, -2);
      parent.appendChild(b);
    }
    last = m.index + t.length;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

function render() {
  var root = document.getElementById('r');
  var parts = TEXT.split(/\$\$([\s\S]+?)\$\$/);
  for (var i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      var d = document.createElement('div');
      d.className = 'disp';
      addMath(d, parts[i].trim(), true);
      root.appendChild(d);
      continue;
    }
    var lines = parts[i].split('\n');
    for (var j = 0; j < lines.length; j++) {
      var ln = lines[j];
      if (!ln.trim()) continue;
      var h = /^(#{1,3})\s+(.*)$/.exec(ln);
      var li = /^\s*[-*]\s+(.*)$/.exec(ln);
      var nu = /^\s*(\d+)[.)]\s+(.*)$/.exec(ln);
      var el;
      if (h) {
        el = document.createElement('h' + (h[1].length + 1));
        addInline(el, h[2]);
      } else if (li) {
        el = document.createElement('div');
        el.className = 'li';
        el.appendChild(document.createTextNode('\u2022 '));
        addInline(el, li[1]);
      } else if (nu) {
        el = document.createElement('div');
        el.className = 'li';
        el.appendChild(document.createTextNode(nu[1] + '. '));
        addInline(el, nu[2]);
      } else {
        el = document.createElement('p');
        addInline(el, ln);
      }
      root.appendChild(el);
    }
  }
}

function report() {
  var h = Math.ceil(document.getElementById('r').getBoundingClientRect().height);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(h));
}

render();
report();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(report);
if (window.ResizeObserver) new ResizeObserver(report).observe(document.getElementById('r'));
setTimeout(report, 500);
`;

function buildHtml(text: string, color: string): string {
  // El < se escapa para que el texto nunca pueda cerrar la etiqueta script
  const payload = JSON.stringify(text).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<link rel='stylesheet' href='${KATEX}katex.min.css'>
<script src='${KATEX}katex.min.js'></script>
<style>
body{margin:0;padding:0;color:${color};font-family:sans-serif;font-size:16px;line-height:1.5;-webkit-text-size-adjust:100%}
#r{display:flow-root}
p{margin:0 0 10px}
h2,h3,h4{margin:14px 0 6px;line-height:1.25}
h2{font-size:21px} h3{font-size:18px} h4{font-size:16px}
.li{margin:0 0 6px;padding-left:4px}
.disp{margin:6px 0 12px;padding:6px 0;overflow-x:auto;overflow-y:hidden}
.katex{font-size:1.1em}
.katex-display{margin:0}
</style></head><body>
<div id='r'></div>
<script>var TEXT = ${payload};</script>
<script>${SCRIPT}</script>
</body></html>`;
}

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