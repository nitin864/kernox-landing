/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: '#f2f2ed',
        soft: '#b2b2ad',
        muted: '#686864',
        line: '#454541',
        dim: '#292925',
        panel: '#080808',
        phosphor: '#b7f397',
        amber: '#d0b87d',
        danger: '#d5a6a6',
      },
      boxShadow: {
        phosphor: '0 0 28px rgba(183, 243, 151, .12)',
      },
    },
  },
  plugins: [],
};
