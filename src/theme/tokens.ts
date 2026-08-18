export const tokens = {
  colors: {
    bg: '#f7f2e8',
    bgMuted: '#f0eadf',
    paper: '#fcf8ef',
    paperBorder: 'rgba(74,55,35,0.16)',
    surface: '#fffdf7',
    surfaceStrong: '#fffaf1',
    white: '#ffffff',
    border: '#ded5c8',
    borderStrong: '#cfc3b3',
    divider: 'rgba(45,59,50,0.14)',
    overlay: 'rgba(0,0,0,0.35)',
    overlaySoft: 'rgba(0,0,0,0.25)',

    text: '#1d261f',
    textMuted: '#687168',
    textFaint: '#939b93',
    textInverse: '#ffffff',
    textInverseMuted: 'rgba(255,255,255,0.9)',
    inputPlaceholder: '#9aa0a6',

    green900: '#244735',
    green700: '#3f6d53',
    green600: '#4c7a60',
    green100: '#dce9df',
    green050: '#eaf1e9',
    focus: '#8b4f2f',

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
