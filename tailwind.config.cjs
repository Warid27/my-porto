/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        jp: ['"Noto Serif JP"', 'serif'],
      },
      colors: {
        jp: {
          base: '#F5EFE6',
          card: '#EDE3D5',
          dark: '#2C2420',
          accent: '#D4A892',
          sakura: '#D4907A',
          stone: '#C4B5A0',
          moss: '#8B9E7E',
          sand: '#E8D5B7',
          charcoal: '#4A3C35',
          muted: '#B09080',
        },
      },
      borderRadius: {
        jp: '12px',
        'jp-sm': '6px',
      },
      boxShadow: {
        'jp-soft': '0 2px 16px rgba(44,36,32,0.08)',
        'jp-card': '0 4px 24px rgba(44,36,32,0.10)',
      },
    },
  },
  plugins: [],
};