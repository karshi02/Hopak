import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        thai: ['var(--font-thai)', 'sans-serif'],
        sans: ['var(--font-sans)', 'var(--font-thai)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        tenant: { DEFAULT: '#2F6FE0', dark: '#1E4FB0' },
        seller: { DEFAULT: '#0E9F8E', dark: '#0F3D38', muted: '#AECFC9', dot: '#2E5F58', tint: '#E9F7F4' },
        admin: { DEFAULT: '#6D5AE0', sidebar: '#111827', sidebarmuted: '#AEB4C0', sidebardot: '#4B5563' },
        ink: {
          DEFAULT: '#111111',
          strong: '#181B22',
          subtitle: '#5B616C',
          muted: '#8A909B',
          faint: '#9AA0AB',
        },
        success: '#12A150',
        warning: { DEFAULT: '#C77C1E', dark: '#B4791A' },
        danger: { DEFAULT: '#C0392B', dark: '#EB4D3D' },
        surface: { ios: '#F2F2F7', web: '#F6F7F9', canvas: '#EDEFF3' },
        'card-border': '#E4E7EC',
      },
      borderRadius: {
        card: '18px',
        btn: '14px',
      },
    },
  },
  plugins: [],
};

export default config;
