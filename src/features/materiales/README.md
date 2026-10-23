# Acceso y materiales — Nils

`src/app/(auth)/login.tsx` conecta registro e inicio de sesión. La pestaña Materiales usa `MaterialesScreen.tsx` como controlador y `BibliotecaView.tsx` como presentación.

`materials.service.ts` conserva los servicios de subida y gestión de materiales, con optimización de fotografías en `src/services/PrepararImagen.ts` y `subirImagen.ts`. `prepararLeccionMaterial.ts` enlaza un tema detectado con su lección guardada o su generación mediante IA.

El detalle de cada material permite abrir lecciones y un examen diagnóstico. Los controles de prueba se sustituyeron por estas acciones de la biblioteca.
