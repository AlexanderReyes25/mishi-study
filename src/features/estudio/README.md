# Lecciones y tarjetas — Kevin

`LessonScreen` y `LessonView` representan la lección y su contrato por bloques. `LeccionConectada` recupera la lección real y enlaza con tarjetas, examen diagnóstico y práctica libre.

`FlashcardsScreen` conecta el repaso con `src/services/study.ts`; `FlashcardView` muestra las tarjetas. `RepasoView` reúne las tarjetas pendientes, lecciones guardadas, exámenes y revisión de procedimientos.

Las fórmulas usan `MathText` y `RichText`. `src/services/estudioIntegracion.ts` valida el material y las lecciones guardadas. El archivo de lección de ejemplo y las rutas de demostración se retiraron de la app final.
