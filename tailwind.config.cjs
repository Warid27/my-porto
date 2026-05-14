/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        nb: {
          black:  '#0A0A0A',
          white:  '#F5F0E8',
          yellow: '#FFE03D',
          pink:   '#FF3CA0',
          blue:   '#3D5AFE',
          green:  '#00E676',
          purple: '#B447FF',
          orange: '#FF6B2B',
        },
      },
      boxShadow: {
        'nb':      '5px 5px 0px #0A0A0A',
        'nb-lg':   '8px 8px 0px #0A0A0A',
        'nb-xl':   '12px 12px 0px #0A0A0A',
        'nb-sm':   '3px 3px 0px #0A0A0A',
        'nb-hover':'2px 2px 0px #0A0A0A',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
};