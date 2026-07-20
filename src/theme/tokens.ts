export const tokens = {
  colors: {
    bg: '#fffefa',
    bgMuted: '#f8f6f1',
    paper: '#fbf6eb',
    paperBorder: 'rgba(80,58,32,0.10)',
    surface: '#ffffff',
    surfaceStrong: '#fffefa',
    white: '#ffffff',
    border: '#e0e0da',
    borderStrong: '#d8d4c9',
    divider: 'rgba(45,59,50,0.10)',
    overlay: 'rgba(0,0,0,0.35)',
    overlaySoft: 'rgba(0,0,0,0.25)',

    text: '#16221c',
    textMuted: '#6d7771',
    textFaint: '#9aa19b',
    textInverse: '#ffffff',
    textInverseMuted: 'rgba(255,255,255,0.9)',
    inputPlaceholder: '#9aa0a6',

    green900: '#2d5a3d',
    green700: '#49805a',
    green600: '#49805a',
    green100: '#e4f0e6',
    green050: '#edf6ef',

    danger: '#b42e3e',
    dangerSoft: '#fdf1f3',
    dangerBorder: '#b42e3e',
  },

  radius: {
    xl: 24,
    lg: 18,
    md: 14,
    sm: 10,
    pill: 999,
  },

  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },

  font: {
    title: 22,
    h1: 22,
    body: 14,
    small: 13,
  },

  shadow: {
    color: '#000',
    opacity: 0.06,
    radius: 12,
    offsetY: 6,
  },
} as const;
