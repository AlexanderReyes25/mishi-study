# Mishi Study

App móvil de estudio con IA (Expo + Supabase + Gemini). Proyecto de Programación II, UMG.

El estudiante sube un material (PDF, foto o texto) y la app detecta sus temas, genera resumen, flashcards y examen, calcula en qué temas va mal y le da lecciones de refuerzo hasta aprobar (60%).

## Empezar (cada integrante, una sola vez)

1. Instalar Node.js (LTS), Git, VS Code y Expo Go en el celular (actualizada: el proyecto usa Expo SDK 57).
2. Clonar el repositorio e instalar:

   ```
   git clone URL-DEL-REPOSITORIO
   cd mishi-study
   npm install
   ```

3. Copiar `.env.example` a `.env` y pedirle a Suar por privado la URL y la clave pública de Supabase. El `.env` nunca se sube a GitHub.
4. `npx expo start` y escanear el QR con Expo Go (celular y laptop en la misma red Wi-Fi).
5. Crear tu cuenta en la pantalla de inicio de sesión.

## Estructura

```
src/
  app/            pantallas (Expo Router): (auth) = login, (tabs) = las 4 pestañas
  components/     piezas compartidas: Screen, Button, Card, ProgressBar, PathNode, Mishi, MathText
  services/       supabase.ts, session.tsx, ai.ts, progress.ts (compartidos) y los de cada parte
  features/       una carpeta por parte (materiales, estudio, examenes, inicio)
  assets/mishi/   imágenes de la mascota
  theme.ts        colores, tamaños y bordes
supabase/
  migrations/     scripts SQL numerados (solo registro; ya están ejecutados)
  functions/ai-study/index.ts   función que llama a Gemini
```

## Quién hace qué

| Parte | Responsable | Carpeta |
|---|---|---|
| Base técnica, IA, Inicio y Progreso | Suar | src/features/inicio |
| 1. Acceso y materiales | Integrante 2 | src/features/materiales |
| 2. Lección y flashcards | Integrante 3 | src/features/estudio |
| 3. Exámenes y refuerzo | Integrante 4 | src/features/examenes |

Cada parte edita solo sus carpetas. Los archivos compartidos (theme.ts, components/, ai.ts, progress.ts, supabase.ts, session.tsx) solo los cambia Suar: se le pide por el grupo.

## Trabajo con Git

```
git checkout develop
git pull
git checkout -b feature/nombre-corto-de-la-tarea
git add .
git commit -m 'Describe lo que hiciste'
git push -u origin feature/nombre-corto-de-la-tarea
```

Después, Pull Request hacia `develop`. Nadie trabaja directo en `main` ni en `develop`.

## Reglas

- Colores y tamaños salen siempre de `src/theme.ts`.
- Botones de al menos 48 px; el acierto o el fallo se marca con color, ícono y texto.
- La IA tiene límites compartidos: 15 solicitudes por minuto y 500 por día. Probar con materiales cortos.
- Nunca subir claves, el `.env` ni la clave secret de Supabase.
- Cambios en la base de datos: solo con un archivo SQL numerado nuevo que ejecuta Suar.

Más detalle en la guía del equipo.

## Estado de la entrega inicial

Esta entrega es el esqueleto para que el equipo trabaje en paralelo. Inicio,
Materiales, Repaso y Progreso todavía contienen pantallas de ejemplo.

- Neils: acceso y materiales, `src/features/materiales`.
- Kevin: lección y flashcards, `src/features/estudio`.
- Pablo: exámenes y refuerzo, `src/features/examenes`.
- Suarlin: base técnica, IA, Inicio y Progreso.

### Contrato actual de IA

`runAi('summary', id)` devuelve `summary` como Markdown.
`runAi('lesson', id, { topic })` devuelve `title`, `lesson` como Markdown y `round`.
El formato por bloques de la guía del equipo corresponde a una versión futura;
Kevin puede usar datos locales de ejemplo hasta acordar ese contrato con Suarlin.
MathText y RichText ya están disponibles para representar el contenido actual.

Pendientes antes de integrar el ciclo completo: impedir el doble registro de
intentos y respuestas, garantizar tres preguntas por tema evaluado, limitar los
tipos de preguntas a los soportados por la interfaz, implementar cuota por
usuario y reportes de preguntas. No usar estos resultados todavía como progreso
validado del estudiante.

### Comprobaciones antes de cada Pull Request

```sh
npm ci
npm run typecheck
npm run lint
npm start
```

Copiar primero `.env.example` a `.env` y completar los valores por un medio
privado. Cada integrante debe probar en su celular el registro, inicio de sesión
y las pantallas de su parte. Nunca poner una clave secreta de Supabase ni de
Gemini en variables EXPO_PUBLIC. Gemini se configura solo en el servidor.

## Publicación inicial en GitHub

Crear un repositorio privado vacío en GitHub, sin agregar README, licencia ni
.gitignore. Copiar su URL. Después de validar la entrega local:

```sh
git switch main
git merge --ff-only feature/preparar-equipo
git branch develop
git remote add origin URL-DEL-REPOSITORIO
git push -u origin main
git push -u origin develop
```

Estos comandos presuponen que existe el commit de preparación en
`feature/preparar-equipo`, y que aún no existen `develop` ni `origin`.
Invitar a Neils, Kevin y Pablo desde Settings > Collaborators. Compartir la URL y
pedir que creen sus ramas desde `develop`. La configuración de Supabase y el
inicio de sesión deben verificarse en un celular antes de anunciar la base como
probada de extremo a extremo.

### Validación de esta preparación

Lint, TypeScript y la prueba aislada de una sola llamada a IA pasan.
`npm ci --dry-run` valida la coherencia del archivo de dependencias; aún falta
probar una instalación limpia y el registro/inicio de sesión en un celular.
`npm audit --omit=dev` reportó 29 vulnerabilidades (18 altas y 11 moderadas) en
el árbol de dependencias. Revisarlas antes de distribuir una versión final.
No ejecutar `npm audit fix --force`: entre las soluciones propuestas hay cambios
de versión principal e incluso una regresión de Expo 57 a Expo 44.
