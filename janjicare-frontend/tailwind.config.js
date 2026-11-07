import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/**
 * Palet JanjiCare (klasik):
 *   Back in Black    #16131F   Mountain Heather #F0D9E4   Decanting #C1A0AC
 *   Funkie Friday    #4A3F4B   Moonscape        #806C79
 *
 * Skala "mauve" dibangun dari kelima warna tersebut. Nama warna Tailwind lama
 * (blue, teal, indigo, violet, ...) dipetakan ke skala ini sehingga seluruh halaman
 * otomatis memakai palet baru tanpa mengganti setiap className.
 * Warna status (sukses/peringatan/bahaya) dibuat redup agar selaras dengan palet.
 */
const mauve = {
  50: '#FAF4F7',
  100: '#F0D9E4', // Mountain Heather
  200: '#E3C5D2',
  300: '#C1A0AC', // Decanting
  400: '#A38592',
  500: '#806C79', // Moonscape
  600: '#655663',
  700: '#4A3F4B', // Funkie Friday
  800: '#2F2833',
  900: '#16131F', // Back in Black
  950: '#0E0C14',
};
const neutral = {
  50: '#FBF9FA',
  100: '#F5F1F3',
  200: '#E9E2E6',
  300: '#D6CCD2',
  400: '#ADA0A8',
  500: '#84767F',
  600: '#655A62',
  700: '#4A4148',
  800: '#2A2430',
  900: '#1C1823',
  950: '#16131F',
};
const sage = {
  50: '#F2F5F0', 100: '#E0E9DC', 200: '#C5D7BF', 300: '#A0BD98', 400: '#7DA173',
  500: '#618658', 600: '#4D6C46', 700: '#3E5739', 800: '#31442E', 900: '#263424', 950: '#161F15',
};
const ochre = {
  50: '#FBF6EC', 100: '#F4E6C8', 200: '#EAD29E', 300: '#DDB86E', 400: '#CC9C47',
  500: '#B5832F', 600: '#946A26', 700: '#74531F', 800: '#59401A', 900: '#433014', 950: '#2A1E0C',
};
const wine = {
  50: '#FBF2F4', 100: '#F4DDE2', 200: '#E8BCC6', 300: '#D692A2', 400: '#BF687D',
  500: '#A24A61', 600: '#853B4F', 700: '#6B2F40', 800: '#522431', 900: '#3C1B24', 950: '#250F15',
};

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', ...defaultTheme.fontFamily.sans],
        serif: ['"Playfair Display"', 'Georgia', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        // Nama palet (dapat dipakai langsung)
        ink: '#16131F',
        heather: '#F0D9E4',
        decant: '#C1A0AC',
        plum: '#4A3F4B',
        moon: '#806C79',
        mauve,
        // Pemetaan warna lama → palet
        blue: mauve, indigo: mauve, violet: mauve, purple: mauve, sky: mauve, cyan: mauve, teal: mauve, fuchsia: mauve,
        gray: neutral, slate: neutral, zinc: neutral, stone: neutral,
        emerald: sage, green: sage, lime: sage,
        amber: ochre, yellow: ochre, orange: ochre,
        rose: wine, red: wine, pink: wine,
      },
      borderRadius: {
        // Sudut lebih tegas & klasik
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.75rem',
      },
      letterSpacing: {
        tight: '-0.01em',
        tighter: '-0.015em',
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [forms],
};
