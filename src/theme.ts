// Colores, tamaños y bordes de Mishi Study.
// REGLA: nadie escribe colores ni tamaños a mano en las pantallas; salen de aquí.
// Solo Suar cambia este archivo (se pide por el grupo).

export const colors = {
  primary: '#2C4251', // azul pizarra: botones, textos, barras
  primaryDark: '#1B2A35',
  primarySoft: '#4A6072',
  accent: '#D16666', // coral: detalles
  success: '#B6C649', // verde lima: acierto y progreso (texto encima: primary)
  successDark: '#8FA033',
  successSoft: '#EEF3CC',
  error: '#A94545', // texto y botones de error (contraste suficiente sobre blanco)
  errorDark: '#7F3232',
  errorSoft: '#F9E4E4',
  neutral: '#C1C1C1', // bordes y elementos desactivados
  neutralSoft: '#E6EAED',
  background: '#FFFFFF',
  surface: '#F4F7F9',
  text: '#2C4251',
  textMuted: '#5E6E79',
  border: '#C1C1C1',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const font = { small: 13, body: 16, subtitle: 18, title: 24, big: 32 };

// Alto mínimo de cualquier elemento que se toca
export const touchMin = 48;
