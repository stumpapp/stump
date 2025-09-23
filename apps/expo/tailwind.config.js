const { hairlineWidth } = require('nativewind/theme')
const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
	presets: [require('nativewind/preset')],
	theme: {
		extend: {
			colors: {
				background: {
					DEFAULT: 'var(--background)',
					inverse: 'var(--background-inverse)',
					overlay: {
						DEFAULT: 'var(--background-overlay)',
						hover: 'var(--background-overlay-hover)',
					},
					surface: {
						DEFAULT: 'var(--background-surface)',
						hover: 'var(--background-surface-hover)',
						secondary: 'var(--background-surface-secondary)',
					},
					// TODO: figure this out
					tabs: 'var(--tabs)',
					opaque: 'var(--background-opaque)',
				},
				edge: {
					DEFAULT: 'var(--edge)',
					brand: 'var(--edge-brand)',
					danger: 'var(--edge-danger)',
					info: 'var(--edge-info)',
					strong: 'var(--edge-strong)',
					subtle: 'var(--edge-subtle)',
					success: 'var(--edge-success)',
					warning: 'var(--edge-warning)',
				},
				fill: {
					brand: {
						DEFAULT: 'var(--fill-brand)',
						hover: 'var(--fill-brand-hover)',
						secondary: 'var(--fill-brand-secondary)',
					},
					danger: {
						DEFAULT: 'var(--fill-danger)',
						hover: 'var(--fill-danger-hover)',
						secondary: 'var(--fill-danger-secondary)',
					},
					disabled: 'var(--fill-disabled)',
					info: {
						DEFAULT: 'var(--fill-info)',
						hover: 'var(--fill-info-hover)',
						secondary: 'var(--fill-info-secondary)',
					},
					success: {
						DEFAULT: 'var(--fill-success)',
						hover: 'var(--fill-success-hover)',
						secondary: 'var(--fill-success-secondary)',
					},
					warning: {
						DEFAULT: 'var(--fill-warning)',
						hover: 'var(--fill-warning-hover)',
						secondary: 'var(--fill-warning-secondary)',
					},
				},
				foreground: {
					DEFAULT: 'var(--foreground)',
					brand: 'var(--foreground-brand)',
					disabled: 'var(--foreground-disabled)',

					muted: 'var(--foreground-muted)',
					'on-inverse': 'var(--foreground-on-inverse)',
					subtle: 'var(--foreground-subtle)',
				},
			},
			borderWidth: {
				hairline: hairlineWidth(),
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
			},
			screens: {
				tablet: '640px',
				xs: '375px',
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
			borderCurve: {
				continuous: 'continuous',
				curve: 'curve',
			},
		},
	},
	plugins: [
		require('tailwindcss-animate'),
		plugin(function ({ addUtilities }) {
			addUtilities({
				'.border-continuous': {
					'@rn-move -rn-border-curve border-curve': 'true',
					'-rn-border-curve': 'continuous',
				},
				'.border-circular': {
					'@rn-move -rn-border-curve border-curve': 'true',
					'-rn-border-curve': 'circular',
				},
				'.squircle': {
					'@rn-move -rn-border-curve border-curve': 'true',
					'-rn-border-curve': 'continuous',
					overflow: 'hidden',
				},
			})
		}),
	],
}
