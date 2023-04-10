/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/**/*.{js,ts,jsx,tsx,html,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,html,mdx}',
		'./pages/**/*.{js,ts,jsx,tsx,html,mdx}',
		'./theme.config.tsx',
	],
	darkMode: 'class',
	plugins: [],
	theme: {
		extend: {},
	},
}
