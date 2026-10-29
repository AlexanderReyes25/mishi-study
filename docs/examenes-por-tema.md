# Exámenes por tema — rama `examenes-1`

## Comportamiento

1. En Exámenes o Materiales, selecciona un material.
2. Elige uno de sus temas. Se reutilizan los temas guardados; si no existen, pulsa **Detectar temas**.
3. Pulsa **Comenzar examen**. Solo entonces se solicita el examen a la IA.
4. La IA decide la cantidad según el contenido legible de ese tema: desde una pregunta hasta un máximo de quince. No se exige llegar a ocho ni llenar el máximo.
5. Responde y termina para guardar el resultado. Puedes volver a elegir otro tema del mismo material.

La reevaluación también usa cantidad automática. Los exámenes de una o dos preguntas guardan su nota; conservan la regla existente de Progreso: el estado del tema solo cambia con al menos tres preguntas en ese intento. No se requieren cambios de tablas ni migraciones SQL.

## Archivos

| Archivo | Responsabilidad |
| --- | --- |
| `src/app/examen/diagnostico.tsx` | Entrada a la selección de tema. |
| `src/features/examenes/components/ExamTopicSelection.tsx` | Carga temas, permite detectar los que faltan y elegir uno. |
| `src/features/examenes/components/ExamIntro.tsx` | Solicita el examen al pulsar el botón y permite cambiar de tema antes de comenzar. |
| `src/app/examen/reevaluacion.tsx` | Reevaluación del tema con cantidad automática. |
| `src/services/exams.ts` | Lectura de temas y envío de `count: "auto"` con un único tema. |
| `src/services/ai.ts` | Contrato de solicitud y respuesta de la IA. |
| `supabase/functions/_shared/exam.ts` | Límite de quince, instrucciones y validación de preguntas. |
| `supabase/functions/ai-study/index.ts` | Verifica selección, consulta la IA y guarda preguntas válidas. |
| `tests/exam-topics/run.cjs` | Pruebas del servidor y de la selección de temas con servicios simulados. |
| `tests/exams/run.cjs` | Pruebas del cliente, guardado y estado del examen. |

El servidor admite solicitudes numéricas de clientes anteriores. En el modo automático exige un tema detectado del material. Filtra preguntas vacías, tipos no admitidos, opciones inválidas, respuestas que no son una opción, duplicados del mismo enunciado y etiquetas de otro tema. Si no queda ninguna pregunta válida, devuelve un mensaje útil sin crear un examen vacío.

La cantidad y la calidad semántica las decide el modelo a partir de las instrucciones; la validación de estructura no demuestra por sí sola que cada explicación sea verdadera. La prueba con material real sigue siendo necesaria.

## Publicación y prueba real

La rama de Git aísla el código, pero la función desplegada de Supabase se comparte con el resto de la app. Publicar esta versión requiere desplegar `ai-study` en el proyecto correcto. No se debe ejecutar `db push` ni volver a ejecutar las migraciones para esta mejora.

Desde la carpeta del proyecto, cuando se decida publicar:

```powershell
npx supabase functions deploy ai-study --use-api --project-ref coyjqhcanpwuzvxekiiw
npm start -- --go --tunnel
```

Si aparece el aviso de servidor antiguo, la aplicación nueva ya cargó, pero `ai-study` todavía no devuelve el contrato actualizado (`countMode: "auto"`). No basta con reiniciar Expo para actualizar esa función.

## Comprobación manual

- **Varios temas:** usar un PDF con temas diferentes; escoger uno y comprobar que todas las preguntas corresponden a él. Volver y escoger otro sin subir de nuevo el archivo.
- **Texto breve:** pegar el ejemplo siguiente. Debe producir pocas preguntas distintas sobre lo escrito, sin inventar contenido para llegar a ocho.
- **Material amplio:** usar apuntes más completos de un tema; comprobar que hay más cobertura si el contenido lo permite y nunca más de quince preguntas.
- **Sin información útil:** probar un material sin contenido académico legible. Debe mostrar un error comprensible, sin abrir un examen vacío.
- **Fórmulas:** usar el PDF de matemáticas y comprobar preguntas, opciones, soluciones y nota final.
- **Nota corta:** si se obtiene un examen de una o dos preguntas, completarlo y comprobar que el intento se guarda y aparece el aviso de muestra breve.
- **Reevaluación:** después de un refuerzo, comprobar que las preguntas siguen dentro de ese tema.

Texto breve para copiar:

```text
Tema: El perímetro de un cuadrado
El cuadrado tiene cuatro lados de igual longitud.
Su perímetro es la suma de sus cuatro lados.
La fórmula es P = 4 × lado.
Si cada lado mide 3 cm, el perímetro es 12 cm.
El perímetro se expresa en unidades de longitud, como centímetros.
```

## Validación local

```powershell
npm run typecheck
npm run lint
npm test
```

Las pruebas simulan IA, red y base de datos. Incluyen una y dos preguntas, exceso de quince, selección entre ocho temas, cambio de tema, errores, doble toque, desmontaje de pantalla, compatibilidad con clientes anteriores y ausencia de exámenes vacíos.
