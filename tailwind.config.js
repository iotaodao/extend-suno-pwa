/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          base:    '#070F1F',
          raised:  '#0B1A2E',
          card:    '#0E2138',
          input:   '#091627',
        },
        soft: {
          DEFAULT: '#A5C8F0',
          deep:    '#7DA8D8',
          glow:    '#5B8FCB',
          dim:     '#8AA4C4',
          mute:    '#5A7090',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans:  ['Manrope', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
