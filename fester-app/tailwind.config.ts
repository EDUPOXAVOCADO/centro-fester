import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fester: {
          blue: '#003B7A',
          'blue-dark': '#002A57',
          'blue-light': '#1E5FA8',
          red: '#D6001C',
          'red-dark': '#A80016',
          gray: '#F4F6F8',
        },
      },
      boxShadow: { card: '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)' },
    },
  },
  plugins: [],
};
export default config;
