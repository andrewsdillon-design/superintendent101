module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        blueprint: {
          bg: '#0a1628',
          grid: '#1a3a5c',
          paper: '#1e3a5f',
        },
        safety: {
          yellow: '#f7b500',
          orange: '#ff6b00',
          red: '#dc2626',
          green: '#22c55e',
          blue: '#3b82f6',
        },
        neon: {
          cyan: '#00d9ff',
          green: '#39ff14',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
