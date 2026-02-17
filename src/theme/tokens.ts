export const tokens = {
  colors: {
    bg: '#fefdfb',
    bgMuted: '#f6f6f4',
    surface: 'rgba(255,255,255,0.82)',
    surfaceStrong: 'rgba(255,255,255,0.92)',
    white: '#ffffff',
    border: 'rgba(0,0,0,0.06)',
    borderStrong: 'rgba(0,0,0,0.10)',
    overlay: 'rgba(0,0,0,0.35)',
    overlaySoft: 'rgba(0,0,0,0.25)',

    text: '#17221b',
    textMuted: 'rgba(23,34,27,0.62)',
    textFaint: 'rgba(23,34,27,0.45)',
    textInverse: '#ffffff',
    textInverseMuted: 'rgba(255,255,255,0.9)',
    inputPlaceholder: '#9aa0a6',

    green900: '#2d5a3d',
    green700: '#5a8a68',
    green600: '#6b9e7a',
    green100: '#e8f3ed',
    green050: '#f0f7f3',

    danger: '#b00020',
    dangerSoft: 'rgba(176,0,32,0.06)',
    dangerBorder: 'rgba(176,0,32,0.25)',
  },

  radius: {
    xl: 20,
    lg: 16,
    md: 12,
    sm: 10,
    pill: 999,
  },

  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
  },

  font: {
    title: 28,
    h1: 22,
    body: 15,
    small: 12,
  },

  shadow: {
    color: '#000',
    opacity: 0.06,
    radius: 12,
    offsetY: 6,
  },
} as const;
