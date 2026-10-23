# Validación de la integración — 22 de octubre de 2026

La carpeta final `Mishi-Study` se creó desde Git. Las copias `app-estudio` y `mishi-prueba-integracion` se conservaron. Las cuatro entregas están incorporadas mediante merges, con sus autores e historial originales.

## Comprobaciones realizadas

- Instalación limpia con `npm ci`: correcta.
- `npm run typecheck`: sin errores.
- `npm run lint`: sin errores ni advertencias de lint.
- `npm test`: 201 escenarios/comprobaciones aisladas aprobados: exámenes (14), servicios de materiales (22), interfaz de materiales (13), práctica (33), progreso y tarjetas (26), contrato y función de revisión (52), estudio y servicios integrados (41).
- Exportación Android con Hermes: correcta. Es una comprobación del paquete JavaScript y recursos, no un APK instalado.
- Revisión visual en navegador a 390 × 844: acceso, pregunta con LaTeX, respuesta incorrecta y explicación, resultado, Progreso y filtros, refuerzo por bloques y pantalla de Mishi.
- Los datos de las pantallas autenticadas durante esa revisión visual fueron simulados. La ruta temporal usada para la revisión se eliminó antes de exportar y subir el código.
- Se comprobó que las cuatro ramas remotas son antecesoras de la integración y que no se añaden `.env`, secretos, reportes locales ni rutas de demostración.
- Se desplegó `ai-review` con la corrección de normalización de espacios del procedimiento. `ai-study` ya estaba activo y no recibió cambios funcionales en esta integración.

## Prueba conjunta pendiente en el teléfono

Usar una cuenta del proyecto compartido para recorrer: acceso → fotografía, PDF o texto → temas → lección → tarjetas → examen → resultado → Progreso → refuerzo → reevaluación. Confirmar también permisos de cámara/galería, regreso con el botón Atrás y recuperación tras una interrupción de red.

Las pruebas automatizadas no consumieron Gemini ni escribieron notas o resultados en cuentas reales. La integración conserva la evaluación formativa de Pablo; no añade vigilancia ni presenta sus resultados como notas oficiales.

## Corrección de importación de PDF

El teléfono mostró el mensaje combinado «vacío, no disponible o supera los 10 MB» al elegir desde Descargas un PDF que indicaba 2.42 MB. Ese mensaje provenía de una comprobación local anterior a la subida; no permitía identificar cuál de las condiciones había fallado.

- Android obtiene el URI autorizado por el selector y espera una copia explícita en `Paths.cache` antes de leer. Limpia únicamente esa copia temporal.
- Los errores de copia, lectura, contenido vacío, formato y tamaño se informan por separado. Un tamaño desconocido en los metadatos no se interpreta como cero bytes.
- Se conserva el máximo de 10 × 1024 × 1024 bytes y se comprueba también el tamaño realmente leído y la cabecera PDF. En navegador se usa el objeto `File` del selector.
- Se añadieron 15 escenarios simulados: archivo de 2.42 MB y caché del selector inaccesible, espera de la copia, metadatos ausentes, límite exacto y exceso de tamaño, errores de lectura y limpieza, iOS y navegador. Pasaron la suite completa, TypeScript, lint y una nueva exportación Android con Hermes.
- Pendiente confirmar la subida y detección de temas con el PDF real del usuario tras recargar Expo Go. Los mocks y la exportación no sustituyen esta comprobación nativa.
