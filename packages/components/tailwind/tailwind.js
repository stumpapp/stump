/* eslint-disable sort-keys-fix/sort-keys-fix */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createThemes } = require('tw-colors')

const brand = {
	100: '#EFDDD1',
	200: '#E4C6B3',
	300: '#D9AF95',
	400: '#CF9977',
	50: '#F4E8E0',
	500: '#C48259',
	600: '#A9663C',
	700: '#7F4D2D',
	800: '#56341F',
	900: '#2D1B10',
	DEFAULT: '#C48259',
}

const gray = {
	DEFAULT: '#7D828A',
	50: '#F6F6F7',
	75: '#E9EAEB',
	100: '#D3D5D7',
	150: '#C8CACD',
	200: '#BEC0C4',
	250: '#B2B5B9',
	300: '#A8ACB0',
	350: '#9DA1A6',
	400: '#93979D',
	450: '#898D94',
	500: '#7D828A',
	550: '#71757D',
	600: '#62666D',
	650: '#565A5F',
	700: '#484B4F',
	750: '#3C3E42',
	800: '#2D2F32',
	850: '#252729',
	900: '#202224',
	950: '#1B1C1E',
	975: '#161719',
	// These last two are way too close in color to be useful
	1000: '#101112',
	// 1000: '#010102',
}

// let woodsmoke = {
// 	DEFAULT: '#161719',
// 	50: '#41444A',
// 	100: '#3F4147',
// 	200: '#3A3C42',
// 	300: '#35373C',
// 	400: '#303237',
// 	500: '#2B2D31',
// 	600: '#27282C',
// 	700: '#222327',
// 	800: '#1D1E21',
// 	900: '#18191C',
// 	950: '#161719',
// }

// const woodsmokeHued = {
// 	DEFAULT: '#161719',
// 	50: '#43414A',
// 	100: '#413F47',
// 	200: '#3B3A42',
// 	300: '#36353C',
// 	400: '#303037',
// 	500: '#2B2C31',
// 	600: '#27272C',
// 	700: '#222327',
// 	800: '#1D1E21',
// 	900: '#18191C',
// 	950: '#161719',
// }

// 'pampas': {  DEFAULT: '#FBFAF9',  50: '#FFFFFF',  100: '#FFFFFF',  200: '#FBFAF9',  300: '#EDE8E4',  400: '#DED6CE',  500: '#D0C4B9',  600: '#C2B3A3',  700: '#B4A18E',  800: '#A58F78',  900: '#967D64',  950: '#8B745D'},

/**
 *
 * @param {string | undefined} relativeFromRoot - relative path from root of project
 * @returns tailwind config object
 */
module.exports = function (relativeFromRoot) {
	let basePath
	if (relativeFromRoot) {
		basePath = `../../${relativeFromRoot}`
	} else {
		basePath = __dirname
	}

	let config = {
		content: [
			'../../interface/src/**/*.{js,ts,jsx,tsx,html}',
			'../../packages/*/src/**/*.{js,ts,jsx,tsx,html}',
			path.join(basePath, './src/**/*.(js|jsx|ts|tsx)'),
		],
		plugins: [
			require('tailwind-scrollbar-hide'),
			require('@tailwindcss/typography'),
			require('tailwindcss-animate'),
			require('tailwindcss-autofill'),
			// require('tailwindcss-text-fill'),
			// require('tailwindcss-shadow-fill'),
			// TODO: move these themes to separate files and create types to enforce structures
			createThemes({
				light: {
					brand,
					sidebar: {
						// The background for the sidebar
						DEFAULT: '#F3F0ED',
						200: '#EDE8E4',
						300: '#E0D6CF',
					},
					background: {
						DEFAULT: '#FFFFFF',
						100: '#FFFFFF',
						200: '#FBFAF9',
						300: '#EDE8E4',
						400: '#E0D6CF',
						500: '#D3C4BA',
					},
					contrast: {
						DEFAULT: '#000000',
						100: '#000000',
						200: '#161719',
					},
					muted: {
						DEFAULT: '#7D828A',
						100: '#7D828A',
						200: '#93979D',
					},
					edge: {
						DEFAULT: '#EDE8E4',
						200: '#E0D6CF',
					},
				},
				dark: {
					brand,
					sidebar: {
						DEFAULT: '#151517',
						200: '#161718',
						300: '#1F2123',
					},
					background: {
						DEFAULT: '#161719',
						100: '#161719',
						200: '#1B1C1D',
						300: '#1F2123',
						400: '#242628',
						500: '#292C30',
					},
					contrast: {
						DEFAULT: '#FFFFFF',
						100: '#FFFFFF',
						200: '#FBFAF9',
					},
					muted: {
						DEFAULT: '#898D94',
						100: '#898D94',
						200: '#71757D',
					},
					edge: {
						DEFAULT: '#1F2123',
						200: '#242628',
					},
				},
			}),
		],
		theme: {
			extend: {
				animation: {
					'accordion-down': 'accordion-down 0.2s ease-out',
					'accordion-up': 'accordion-up 0.2s ease-out',
				},
				fontFamily: {
					sans: ['Inter var', ...defaultTheme.fontFamily.sans],
				},
				colors: {
					brand,
					gray,
				},
				keyframes: {
					'accordion-down': {
						from: { height: 0 },
						to: { height: 'var(--radix-accordion-content-height)' },
					},
					'accordion-up': {
						from: { height: 'var(--radix-accordion-content-height)' },
						to: { height: 0 },
					},
				},
				ringColor: {
					DEFAULT: brand['500'],
				},
				screens: {
					'3xl': '1600px',
					'4xl': '1920px',
				},
				fontSize: {
					xxs: '0.65rem',
				},
			},
		},
		variants: {
			extend: {
				backgroundImage: ['dark'],
			},
		},
	}

	return config
}
