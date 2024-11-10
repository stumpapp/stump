/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{js,jsx,ts,tsx}'],
	plugins: [],
	theme: {
		extend: {
			colors: {
				// FIXME: These colors simply won't work, they were built
				// as separate light/dark themes for the web app, and merging them
				// in this way is not going to work.
				gray: {
					DEFAULT: '#292C30',
					50: '#E2E4E6',
					100: '#CCCFD3',
					200: '#A0A6AE',
					300: '#747D88',
					400: '#4F545C',
					500: '#292C30',
					600: '#242628',
					700: '#1F2123',
					800: '#1B1C1D',
					900: '#161719',
					950: '#0F1011',
				},
			},
		},
	},
}
