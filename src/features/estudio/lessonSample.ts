import { LessonBlock } from './lessonTypes';

// Datos de ejemplo escritos a mano, mientras llega el servidor v3.
export const sampleLesson: { title: string; blocks: LessonBlock[] } = {
  title: 'Ecuaciones cuadráticas',
  blocks: [
    {
      type: 'text',
      content: 'Una ecuación cuadrática tiene la forma ax² + bx + c = 0. Para resolverla se usa la fórmula general:',
    },
    { type: 'formula', latex: String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}` },
    {
      type: 'example',
      title: 'Resolver x² − 5x + 6 = 0',
      steps: [
        { text: 'Identifica a = 1, b = −5 y c = 6.' },
        { text: 'Calcula el discriminante.', latex: String.raw`b^2 - 4ac = 25 - 24 = 1` },
        { text: 'Sustituye en la fórmula.', latex: String.raw`x = \frac{5 \pm \sqrt{1}}{2}` },
        { text: 'Resultado: x = 3 o x = 2.', latex: String.raw`x_1 = 3,\; x_2 = 2` },
      ],
    },
    { type: 'tip', content: 'Si el discriminante es negativo, no hay soluciones reales.' },
    // Para probar una fórmula inválida (no debe cerrar la app):
    { type: 'formula', latex: String.raw`\frac{1}{` },
  ],
};
