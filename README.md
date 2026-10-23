# Mishi Study

App de estudio de Programación II, UMG, construida con Expo SDK 57, React Native, Supabase y Gemini. Integra las entregas del equipo con una interfaz común y cuatro pestañas: **Inicio, Materiales, Repaso y Progreso**.

## Instalar y probar

Requisitos: Node.js LTS compatible con Expo 57, Git y Expo Go compatible con ese SDK. La integración se verificó con Node 24.

```powershell
git clone --branch integracion/mishi-study https://github.com/AlexanderReyes25/mishi-study.git Mishi-Study
cd Mishi-Study
npm ci
Copy-Item .env.example .env
```

Completa `.env` con la URL y la clave pública del proyecto de Supabase que comparte Suarlin. Después:

```powershell
npm start -- --go
```

Escanea el QR en Expo Go con computadora y teléfono en la misma red. Si necesitas túnel porque la red impide la conexión local, usa `npm start -- --go --tunnel`. Requiere internet en ambos dispositivos. La app móvil usa las mismas funciones que el sitio de desarrollo; la cámara, galería, permisos y botón Atrás deben comprobarse en un teléfono.

Para abrirla en el navegador: `npm run web`. Para limpiar la caché de desarrollo: `npm start -- --go --clear`. La barra o los controles de desarrollo de Expo Go pertenecen a Expo Go; la app tiene una sola barra propia de navegación. Un instalable independiente se genera con EAS Build.

Nunca coloques la clave de Gemini, una clave `service_role` ni secretos en variables `EXPO_PUBLIC_*`. `.env` permanece fuera de Git.

## Recorrido integrado

1. **Acceso:** crear cuenta, iniciar sesión y cerrar sesión.
2. **Materiales:** tomar foto, elegir de la galería, subir PDF o pegar texto; optimizar fotos; detectar varios temas; editar, filtrar y eliminar materiales.
3. **Lecciones:** elegir un tema del material para preparar o recuperar su lección; representar explicaciones, fórmulas LaTeX, pasos y consejos.
4. **Repaso:** tarjetas con repetición espaciada, lecciones guardadas y práctica libre. El procedimiento puede escribirse o fotografiarse; el usuario confirma la transcripción antes de revisarlo.
5. **Exámenes:** desde Materiales, una lección o Repaso. Diagnóstico, comprobación por pregunta, resultados por tema, refuerzo y reevaluación mantienen el comportamiento entregado por Pablo.
6. **Progreso:** actividad real de la cuenta, temas evaluados, dominio acumulado, búsqueda, filtros y sugerencia del siguiente paso. Se actualiza al entrar y permite recargar.

Inicio conserva la sombra inclinada y tenue de Mishi. La preparación de lecciones y exámenes usa el gato animado con orejas y respiración suave. Los botones y pantallas de pruebas se retiraron de esta integración; sus funciones están conectadas a las pantallas anteriores.

## Entregas incorporadas

Se hicieron merges que conservan el historial de cada integrante, seguidos de la integración de interfaz y Progreso:

| Responsable | Entrega | Rama de origen | Último commit integrado |
|---|---|---|---|
| Suarlin | Base, IA, fotos, procedimientos, Inicio y carga | `feature/suarlin-ia` | `9ad1350` |
| Nils | Acceso y materiales | `feature/acceso-materiales` | `6a2e75a` |
| Kevin | Lecciones y flashcards | `feature/leccion-flashcards` | `2f997f3` |
| Pablo / Lemus365 | Exámenes y refuerzo | `feature/pablo-examenes-refuerzo` | `9b742e5` |

La interfaz común y Progreso se incorporan en `integracion/mishi-study`. Las ramas de los compañeros se conservan.

## Estructura

```text
src/app/                  Rutas y navegación de Expo Router
  (auth)/                 Acceso
  (tabs)/                 Las cuatro pestañas principales
  estudio/                Lección, tarjetas y práctica libre
  examen/                 Diagnóstico, preguntas, resultados y refuerzo
src/components/           Mishi, carga, botones, tarjetas, Page y MathText
src/features/             Pantallas y lógica de cada módulo
src/services/             Supabase, IA, materiales, estudio, exámenes y progreso
src/theme.ts              Colores, tamaños y espaciados compartidos
supabase/functions/       ai-study, ai-review y contratos compartidos
supabase/migrations/      Registro SQL 001–004
tests/                    Pruebas aisladas de integración, sin escribir en Supabase
```

`runAi('lesson', id, { topic })` devuelve `title`, `lesson`, `round` y opcionalmente `blocks`. Las pantallas usan bloques cuando existen y conservan compatibilidad con lecciones antiguas de texto. Las fórmulas usan KaTeX; su carga inicial requiere conexión al CDN.

## Backend

Los colaboradores usan el proyecto compartido ya configurado; clonar Git no crea otra base de datos ni despliega las funciones. No vuelvas a ejecutar las migraciones sobre una base que ya las tiene.

Para un proyecto nuevo, el responsable debe aplicar en orden `001_schema.sql`, `002_adaptive.sql`, `003_permisos.sql` y `004_lecciones_por_bloques.sql`, configurar el bucket privado `materials`, autenticación y secretos de Gemini, y desplegar `ai-study` y `ai-review`. Las políticas de almacenamiento se definen en `001_schema.sql`.

```powershell
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy ai-study --use-api
npx supabase functions deploy ai-review --use-api
```

Las claves de Gemini se configuran en los secretos de Supabase, nunca en el cliente. El modelo se puede configurar con `GEMINI_MODEL`. Las cuotas y disponibilidad dependen de la cuenta del proveedor; no se reintentan automáticamente las generaciones para evitar solicitudes duplicadas.

## Comprobaciones

```powershell
npm run typecheck
npm run lint
npm test
npx expo export --platform android --output-dir dist/android
```

`npm test` verifica servicios, contratos de IA y controladores con Supabase, Gemini, cámara y red simulados. Incluye errores de guardado, reintentos, dobles toques, cambio de sesión, paginación de Progreso y conservación de respuestas. Estas pruebas no sustituyen el recorrido con una cuenta real en Expo Go.

Antes de presentar, comprueba en el teléfono: login → subir material → detectar temas → abrir lección → repasar tarjetas → completar examen → ver resultado en Progreso → reforzar y reevaluar. Prueba también permisos de cámara, una conexión interrumpida y volver a iniciar sesión.

### Alcance de los resultados

Los exámenes son una herramienta de práctica. Se conserva el umbral del 60% y el mínimo de tres preguntas por tema para cambiar su clasificación. La práctica libre y las tarjetas no modifican el dominio de los exámenes. La corrección actual consulta la solución desde el cliente; no es un sistema de evaluación oficial ni incluye bloqueo de salida o detección de copia. La IA puede equivocarse y debe contrastarse con el material.

El cliente evita dobles toques y reutiliza escrituras confirmadas al reintentar. La base de datos todavía no garantiza idempotencia entre clientes concurrentes del mismo intento; no abrir simultáneamente el mismo examen en dos dispositivos. Si se cierra la app antes de terminar, el examen en curso no tiene recuperación persistente.

## Trabajo del equipo

Crea una rama desde la base de integración acordada, realiza cambios y abre un Pull Request hacia `develop`. No se trabaja directamente sobre `main` ni `develop`. Cambios de base de datos van en una migración numerada nueva y se coordinan con Suarlin. Conserva los componentes compartidos y ejecuta las comprobaciones antes de pedir revisión.
