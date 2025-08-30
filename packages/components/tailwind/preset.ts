import typographyPlugin from '@tailwindcss/typography'
// @ts-expect-error: no types
import scrollbarPlugin from 'tailwind-scrollbar-hide'
import { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import animatePlugin from 'tailwindcss-animate'
// @ts-expect-error: no types
import autofillPlugin from 'tailwindcss-autofill'
import { createThemes } from 'tw-colors'

import { sharedColors, themes } from '../themes'

export default {
	content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
	plugins: [scrollbarPlugin, typographyPlugin, animatePlugin, autofillPlugin, createThemes(themes)],
	safelist: [
		{
			pattern: /font-.*/,
		},
	],
	theme: {
		extend: {
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'indeterminate-progress': 'indeterminate-progress 1s infinite linear',
			},
			colors: {
				brand: sharedColors.brand,
				gray: sharedColors.gray,
			},
			fontFamily: {
				inter: ['Inter var', ...defaultTheme.fontFamily.sans],
				opendyslexic: ['OpenDyslexic', ...defaultTheme.fontFamily.sans],
				atkinsonhyperlegible: ['Atkinson Hyperlegible', ...defaultTheme.fontFamily.sans],
				charis: ['Charis SIL', ...defaultTheme.fontFamily.serif],
				literata: ['Literata', ...defaultTheme.fontFamily.serif],
				bitter: ['Bitter', ...defaultTheme.fontFamily.serif],
				librebaskerville: ['Libre Baskerville', ...defaultTheme.fontFamily.serif],
				nunito: ['Nunito', ...defaultTheme.fontFamily.sans],
			},
			fontSize: {
				xxs: '0.65rem',
			},
			lineHeight: {
				none: '1',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'indeterminate-progress': {
					'0%': { transform: ' translateX(0) scaleX(0)' },
					'100%': { transform: 'translateX(100%) scaleX(0.5)' },
					'40%': { transform: 'translateX(0) scaleX(0.4)' },
				},
			},
			ringColor: {
				DEFAULT: sharedColors.brand['500'],
			},
			screens: {
				'3xl': '1600px',
				'4xl': '1920px',
				tablet: '640px',
			},
			transformOrigin: {
				'left-to-right-indeterminate': '0% 50%',
			},
		},
	},
	variants: {
		extend: {
			backgroundImage: ['dark'],
		},
	},
} satisfies Config
