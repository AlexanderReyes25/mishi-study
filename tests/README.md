# Pruebas de integración

Ejecuta `npm test` después de `npm ci`. No requieren `.env`, conexión ni credenciales. Supabase, Gemini, cámara, archivos del teléfono y los hooks usados por los controladores se simulan en memoria; no modifican cuentas ni materiales reales.

Las suites verifican exámenes, gestión de materiales, preparación de lecciones, revisión de procedimientos, tarjetas y Progreso. Los archivos `*report.json` se generan localmente y están ignorados por Git. No son pantallas ni botones de la aplicación: conviene conservar estas pruebas automatizadas aunque ya se hayan retirado las demostraciones de Inicio.

La verificación de permisos y comportamiento nativo se realiza por separado en Expo Go. El renderizado visual se revisó en navegador a 390 px de ancho; no es una prueba de extremo a extremo contra la IA desplegada.
