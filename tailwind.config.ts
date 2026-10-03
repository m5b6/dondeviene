import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121212',
        paper: '#F4F3EE',
        rule: '#D9D7CF',
        mute: '#6B6A65',
        body: '#3A3935',
        signal: '#FFC20E',
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'var(--font-archivo)', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        label: ['13px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '700' }],
        stop: ['30px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '800' }],
        sign: ['44px', { lineHeight: '46px', letterSpacing: '-0.02em', fontWeight: '800' }],
        minutes: ['52px', { lineHeight: '52px', letterSpacing: '-0.03em', fontWeight: '800' }],
        display: ['120px', { lineHeight: '104px', letterSpacing: '-0.04em', fontWeight: '800' }],
      },
      borderRadius: { plate: '8px' },
      spacing: { target: '56px' },
    },
  },
  plugins: [],
};

export default config;
