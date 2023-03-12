/* eslint-disable sort-keys-fix/sort-keys-fix */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path')

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

// const oldGray = {
// 	100: '#EDF2F7',
// 	1000: '#0B0C11',
// 	1050: '#050507',
// 	1100: '#010101',
// 	150: '#E8EDF4',
// 	200: '#E2E8F0',
// 	250: '#D8DFE9',
// 	300: '#CBD5E0',
// 	350: '#B7C3D1',
// 	400: '#A0AEC0',
// 	450: '#8B99AD',
// 	50: '#F7FAFC',
// 	500: '#718096',
// 	550: '#5F6C81',
// 	600: '#4A5568',
// 	65: '#F3F7FA',
// 	650: '#3D4759',
// 	700: '#2D3748',
// 	75: '#F1F5F9',
// 	750: '#212836',
// 	800: '#1A202C',
// 	850: '#191D28',
// 	900: '#171923',
// 	950: '#11121A',
// }

const newGray = {
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
	900: '#1B1C1E',
	// These last two are way too close in color to be useful
	950: '#101112',
	1000: '#010102',
}

const slate = {
	50: '#f8fafc',
	75: '#F4F7FA',
	100: '#f1f5f9',
	150: '#E9EEF4',
	200: '#e2e8f0',
	250: '#D5DEE8',
	300: '#cbd5e1',
	350: '#B2BECE',
	400: '#94a3b8',
	450: '#7E8EA4',
	500: '#64748b',
	550: '#57667C',
	600: '#475569',
	650: '#3E4C60',
	700: '#334155',
	750: '#293649',
	800: '#1e293b',
	850: '#172133',
	900: '#0f172a',
	1000: '#070c1f',
}

const zinc = {
	50: '#fafafa',
	75: '#F6F6F6',
	100: '#f4f4f5',
	150: '#EBEBED',
	200: '#e4e4e7',
	250: '#DDDDE0',
	300: '#d4d4d8',
	350: '#BDBDC3',
	400: '#a1a1aa',
	450: '#8B8B94',
	500: '#71717a',
	550: '#63636A',
	600: '#52525b',
	650: '#47474F',
	700: '#3f3f46',
	750: '#35353C',
	800: '#27272a',
	850: '#1F1F22',
	900: '#18181b',
	1000: '#0D0D0F',
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
			'../../packages/*/src/**/*.{js,ts,jsx,tsx,html}',
			// app ? `../../apps/${app}/src/**/*.{js,ts,jsx,tsx,html}` : `./src/**/*.{js,ts,jsx,tsx,html}`,
			path.join(basePath, './src/**/*.(js|jsx|ts|tsx)'),
		],
		// NOTE: this allows me to sync tailwind dark mode with chakra-ui dark mode *yeet*
		// so happy I found this!
		// darkMode: ['class', '[data-theme="dark"]'],
		darkMode: 'class',
		plugins: [
			require('tailwind-scrollbar-hide'),
			require('@tailwindcss/typography'),
			require('tailwindcss-animate'),
		],
		theme: {
			extend: {
				animation: {
					'accordion-down': 'accordion-down 0.2s ease-out',
					'accordion-up': 'accordion-up 0.2s ease-out',
				},
				colors: {
					brand,
					gray: newGray,
					slate,
					zinc,
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
