const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

const brand = {
	DEFAULT: '#C48259',
	50: '#F4E8E0',
	100: '#EFDDD1',
	200: '#E4C6B3',
	300: '#D9AF95',
	400: '#CF9977',
	500: '#C48259',
	600: '#A9663C',
	700: '#7F4D2D',
	800: '#56341F',
	900: '#2D1B10',
};

module.exports = {
	mode: 'jit',
	// Add support for dark mode, toggled via a class:
	// https://tailwindcss.com/docs/dark-mode
	darkMode: 'class',
	// Inform Tailwind of where our classes will be defined:
	// https://tailwindcss.com/docs/optimizing-for-production
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				gray: {
					50: '#F7FAFC',
					100: '#EDF2F7',
					150: '#E8EDF4',
					200: '#E2E8F0',
					250: '#D8DFE9',
					300: '#CBD5E0',
					350: '#B7C3D1',
					400: '#A0AEC0',
					450: '#8B99AD',
					500: '#718096',
					550: '#5F6C81',
					600: '#4A5568',
					650: '#3D4759',
					700: '#2D3748',
					750: '#212836',
					800: '#1A202C',
					850: '#191D28',
					900: '#171923',
				},
				brand,
			},
			ringColor: {
				DEFAULT: brand['500'],
			},
		},
		fontFamily: {
			sans: ['Inter var', ...defaultTheme.fontFamily.sans],
		},
	},
	plugins: [
		require('tailwind-scrollbar-hide'),
		require('@tailwindcss/forms'),
		require('@tailwindcss/typography'),
	],
};
