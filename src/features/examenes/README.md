# Parte 3: Exámenes y refuerzo (Pablo · Integrante 4)

Examen diagnóstico por material, retroalimentación inmediata, resultados por tema,
lección de refuerzo y reevaluación del tema hasta aprobar (60%).

## Rutas (`src/app/examen/`)

| Ruta | Qué hace |
|---|---|
| `_layout.tsx` | Exige sesión (si no hay, redirige a `/login`) y envuelve todo en `ExamProvider`. |
| `/examen` | Lista los materiales del usuario con el botón "Examen diagnóstico". |
| `/examen/diagnostico?materialId=…&title=…` | Introducción; crea el examen con `runAi('exam', materialId, { kind: 'diagnostic', count: 8 })`. |
| `/examen/pregunta` | Una pregunta por pantalla, "Pregunta X de N", barra de progreso y panel inferior de retroalimentación. |
| `/examen/resultado` | Resultado global y por tema (correctas/total, %, barra, Aprobado / En refuerzo / Pendiente). |
| `/examen/refuerzo?materialId=…&topic=…` | Lección `runAi('lesson', materialId, { topic })` con `MathText`. |
| `/examen/reevaluacion?materialId=…&topic=…` | `runAi('exam', materialId, { kind: 'reevaluation', topics: [topic], count: 6 })` y vuelve al mismo flujo. |

Para abrir el módulo desde otra parte de la app: `router.push('/examen')` o
`router.push({ pathname: '/examen/diagnostico', params: { materialId, title } })`.

## Archivos

- `src/services/exams.ts`: crear examen (descarta preguntas `open`), corregir contra
  `exam_questions`, guardar el intento, leer `topic_progress` y pedir la lección.
- `ExamProvider.tsx`: estado del examen en curso compartido entre pantallas, con
  protección contra doble toque en crear, comprobar y terminar.
- `lessonCache.ts`: lecciones en memoria (una solicitud por tema); se descartan al
  terminar un examen nuevo de ese tema.
- `components/`: `ExamIntro`, `OptionButton`, `FeedbackPanel`, `TopicResultCard`,
  `StatusCards` (carga y error con reintento).
- `format.ts`, `navigation.ts`, `params.ts`: ayudas pequeñas.

## Reglas que cumple

- Diseño: solo `Screen`, `Card`, `Button`, `ProgressBar`, `MathText` y `src/theme.ts`;
  ningún color ni tamaño escrito a mano. Todo lo tocable mide al menos `touchMin`.
- Acierto y fallo siempre con color + ícono + texto: panel verde "¡Correcto!" o coral
  "Incorrecto" con la respuesta correcta y la explicación; opciones con etiquetas
  "Correcta" y "Tu respuesta".
- La respuesta correcta y la explicación se leen de `exam_questions` al comprobar
  (la IA no las envía al crear el examen). Se compara sin importar mayúsculas ni espacios.
- Guardado solo al terminar y sin duplicados: 1) un intento por examen en
  `exam_attempts`; 2) todas las respuestas en un solo insert a `attempt_answers`
  (`ai_feedback` solo en las falladas); 3) `recordAttempt` solo si el intento aún no
  tiene `finished_at`. Cada paso revisa la base antes de escribir, así "Reintentar"
  no repite lo ya hecho.
- Resultados con `PASS_MARK` y `MIN_QUESTIONS_PER_TOPIC`; aviso de "Pendiente" cuando
  un tema tuvo pocas preguntas. Materia: la del material o "General".
- Aviso de método más sencillo cuando `failed_rounds >= ROUNDS_BEFORE_SIMPLER_METHOD`.
- IA (15 solicitudes por minuto): los exámenes se crean solo al tocar un botón, nunca
  en un efecto ni con reintentos automáticos; la lección se pide una vez por tema.
- Sin `setState` síncrono dentro de `useEffect` (React Compiler); todo tipado, sin `any`.
- No modifica archivos compartidos.

## Pendiente con Suar (archivos compartidos)

- Falta un acceso a `/examen` desde las pestañas o desde Inicio/Materiales.
- `record_exam_attempt` no es idempotente en la base: si se llamara dos veces
  sumaría el intento dos veces. La app lo evita revisando `finished_at`, pero
  conviene protegerlo también en SQL (por ejemplo, salir si `finished_at` ya existe).
