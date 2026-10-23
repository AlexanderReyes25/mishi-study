# Exámenes y refuerzo

Entrega de Pablo (Lemus365), integrada con el diseño compartido y Progreso.

## Entradas y recorrido

Materiales, Lección y Repaso abren `/examen`. Las rutas `diagnostico`, `pregunta`, `resultado`, `refuerzo` y `reevaluacion` conservan la lógica de Pablo. El acceso requiere sesión; `ExamProvider` se reinicia por usuario. No añade una pestaña ni una segunda barra inferior.

`services/exams.ts` crea el examen, consulta la solución de cada pregunta, guarda el intento completo y llama a `record_exam_attempt`. Progreso lee `topic_progress` al volver a su pestaña. Los resultados enlazan directamente a Progreso.

## Integración

- Pantallas con `Page`, botones y colores de `theme.ts`.
- Fórmulas en preguntas, opciones, retroalimentación y refuerzo.
- Refuerzo acepta el contrato por bloques y lecciones antiguas de texto.
- Generación con la pantalla animada de Mishi.
- Doble toque protegido al generar, comprobar, avanzar y guardar.
- Se exige responder todas las preguntas antes de guardar.
- Solo se muestra un resultado confirmado por `finished_at`.
- Fallos de guardado conservan las respuestas para reintentar.
- La caché de refuerzo está aislada por cuenta y limitada a 32 entradas; respuestas tardías no actualizan pantallas desmontadas.

Se mantienen 60% de aprobación, mínimo de tres preguntas por tema para cambiar su estado, y método simplificado tras tres rondas fallidas. El diagnóstico puede dejar temas con pocas preguntas pendientes de clasificación. Una etiqueta de resultado favorable no equivale automáticamente a un cambio del estado acumulado.

## Verificación y límites

`node tests/exams/run.cjs` comprueba estas transiciones con servicios simulados. `npm test` incluye además materiales, lecciones, tarjetas, procedimientos y Progreso.

La comparación de respuestas sigue ejecutándose en el cliente, como en la entrega original. No incluye vigilancia, bloqueo de salida ni detección de IA. Los intentos incompletos solo viven en memoria. Los reintentos de un cliente reutilizan escrituras confirmadas; la concurrencia entre dispositivos no tiene una garantía transaccional nueva en esta integración.
