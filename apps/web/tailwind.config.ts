// import type { Config } from 'tailwindcss';

// const config: Config = {
//   content: ['./src/**/*.{ts,tsx}'],
//   theme: {
//     extend: {
//       fontFamily: {
//         thai: ['var(--font-thai)', 'sans-serif'],
//         sans: ['var(--font-sans)', 'var(--font-thai)', 'sans-serif'],
//         mono: ['var(--font-mono)', 'monospace'],
//       },
//       colors: {
//         tenant: { DEFAULT: '#2F6FE0', dark: '#1E4FB0' },
//         seller: { DEFAULT: '#0E9F8E', dark: '#0F3D38', muted: '#AECFC9', dot: '#2E5F58', tint: '#E9F7F4' },
//         admin: { DEFAULT: '#6D5AE0', sidebar: '#111827', sidebarmuted: '#AEB4C0', sidebardot: '#4B5563' },
//         ink: {
//           DEFAULT: '#111111',
//           strong: '#181B22',
//           subtitle: '#5B616C',
//           muted: '#8A909B',
//           faint: '#9AA0AB',
//         },
//         success: '#12A150',
//         warning: { DEFAULT: '#C77C1E', dark: '#B4791A' },
//         danger: { DEFAULT: '#C0392B', dark: '#EB4D3D' },
//         surface: { ios: '#F2F2F7', web: '#F6F7F9', canvas: '#EDEFF3' },
//         'card-border': '#E4E7EC',
//       },
//       borderRadius: {
//         card: '18px',
//         btn: '14px',
//       },
//     },
//   },
//   plugins: [],
// };

// export default config;
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
        // ── App themes ──
        tenant: { DEFAULT: '#2F6FE0', dark: '#1E4FB0', tint: '#EAF1FD' },
        seller: { DEFAULT: '#0E9F8E', dark: '#0F3D38', muted: '#AECFC9', dot: '#2E5F58', tint: '#E9F7F4' },
        admin: { DEFAULT: '#6D5AE0', dark: '#4B3FBF', tint: '#F1EEFD', sidebar: '#111827', sidebarmuted: '#AEB4C0', sidebardot: '#4B5563' },

        // ── Text ──
        ink: {
          DEFAULT: '#111111',
          strong: '#181B22',
          body: '#3A3F49',
          subtitle: '#5B616C',
          muted: '#8A909B',
          faint: '#9AA0AB',
        },

        // ── Semantic ──
        success: { DEFAULT: '#12A150', tint: '#E9F7EF' },
        warning: { DEFAULT: '#C77C1E', dark: '#B4791A', tint: '#FEF3E9' },
        danger: { DEFAULT: '#C0392B', dark: '#EB4D3D', tint: '#FEF3F2' },

        // ── Surfaces / lines ──
        surface: { ios: '#F2F2F7', web: '#F6F7F9', canvas: '#EDEFF3' },
        'card-border': '#E4E7EC',
        hairline: '#EFF1F4',
      },
      borderRadius: {
        input: '11px',   // ช่องกรอกฟอร์ม (เว็บ)
        card: '16px',    // การ์ดมือถือ iOS
        'card-lg': '18px', // การ์ด/กล่องใหญ่ (เว็บ)
        btn: '14px',
        pill: '999px',
      },
      boxShadow: {
        'btn-tenant': '0 6px 16px rgba(47,111,224,0.28)',
        'btn-seller': '0 6px 16px rgba(14,159,142,0.28)',
        'btn-admin': '0 6px 16px rgba(109,90,224,0.28)',
        card: '0 1px 3px rgba(16,24,40,0.06)',
        'card-hover': '0 8px 22px rgba(16,24,40,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
