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
				accent: {
					50: 'rgb(var(--accent-50) / <alpha-value>)',
					100: 'rgb(var(--accent-100) / <alpha-value>)',
					200: 'rgb(var(--accent-200) / <alpha-value>)',
					300: 'rgb(var(--accent-300) / <alpha-value>)',
					400: 'rgb(var(--accent-400) / <alpha-value>)',
					500: 'rgb(var(--accent-500) / <alpha-value>)',
					600: 'rgb(var(--accent-600) / <alpha-value>)',
					700: 'rgb(var(--accent-700) / <alpha-value>)',
					800: 'rgb(var(--accent-800) / <alpha-value>)',
					900: 'rgb(var(--accent-900) / <alpha-value>)',
					950: 'rgb(var(--accent-950) / <alpha-value>)',
				},
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
					'on-fill': 'var(--foreground-on-fill)',
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
