/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable sort-keys-fix/sort-keys-fix */

const path = require('path')
const defaultTheme = require('tailwindcss/defaultTheme')
const { createThemes } = require('tw-colors')
const {
	themes: { bronze, dark, light },
	sharedColors,
} = require('../themes')

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
			createThemes({
				dark,
				light,
				bronze,
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
					brand: sharedColors.brand,
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
					DEFAULT: sharedColors.brand['500'],
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
