/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable sort-keys-fix/sort-keys-fix */

const path = require('path')
const defaultTheme = require('tailwindcss/defaultTheme')
const { createThemes } = require('tw-colors')
const {
	themes: { bronze, dark, light },
	sharedColors,
} = require('../themes')

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
			'../../packages/browser/src/**/*.{js,ts,jsx,tsx,html}',
			'../../packages/*/src/**/*.{js,ts,jsx,tsx,html}',
			path.join(basePath, './src/**/*.(js|jsx|ts|tsx)'),
		],
		safelist: [
			{
				pattern: /font-.*/,
			},
		],
		plugins: [
			require('tailwind-scrollbar-hide'),
			require('@tailwindcss/typography'),
			require('tailwindcss-animate'),
			require('tailwindcss-autofill'),
			// FIXME: these two plugins break when combined with the theme plugin. They are simple enough
			// to manually implement, so I'm disabling them for now.
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
					inter: ['Inter var', ...defaultTheme.fontFamily.sans],
					opendyslexic: ['OpenDyslexicRegular', ...defaultTheme.fontFamily.sans],
				},
				colors: {
					brand: sharedColors.brand,
					gray: sharedColors.gray,
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
