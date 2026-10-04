/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        card: 'hsl(var(--card))',
        borderc: 'hsl(var(--borderc))',
        fg: 'hsl(var(--fg))',
        muted: 'hsl(var(--muted))',
        mutedfg: 'hsl(var(--mutedfg))',
        navy: 'hsl(var(--navy))',
        copper: 'hsl(var(--copper))',
        teal: 'hsl(var(--teal))',
        ink: 'hsl(var(--ink))',
        accent: 'hsl(var(--accent))',
        copperlight: 'hsl(var(--copper) / 0.12)',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};
