import { StumpTheme } from './types'

export const ocean = {
	background: {
		DEFAULT: '#0B3D4D',
		inverse: '#E8F9FF',
		overlay: {
			DEFAULT: '#12455B',
			hover: '#155A73',
		},
		surface: {
			DEFAULT: '#1B6B7D',
			hover: '#227E95',
			secondary: '#165C72',
		},
	},
	edge: {
		DEFAULT: '#165C72',
		brand: '#0A9396',
		danger: '#D62828',
		info: '#0096C7',
		strong: '#E8F9FF',
		subtle: '#125A6D',
		success: '#2E7D32',
		warning: '#FFBA08',
	},
	fill: {
		brand: {
			DEFAULT: '#0A9396',
			secondary: '#0A939626',
		},
		danger: {
			DEFAULT: '#E63946',
			secondary: '#E6394626',
		},
		disabled: '#577590',
		info: {
			DEFAULT: '#0096C7',
			secondary: '#0096C726',
		},
		success: {
			DEFAULT: '#43AA8B',
			secondary: '#43AA8B26',
		},
		warning: {
			DEFAULT: '#F77F00',
			secondary: '#F77F0026',
		},
	},
	foreground: {
		DEFAULT: '#EDF2F4',
		disabled: '#94A1AC',
		muted: '#94A1AC',
		'on-inverse': '#0B3D4D',
		subtle: '#D9E4EA',
	},
	sidebar: {
		DEFAULT: '#0B3D4D',
		inverse: '#E8F9FF',
		overlay: {
			DEFAULT: '#0B3D4D',
			hover: '#155A73',
		},
		surface: {
			DEFAULT: '#12455B',
			hover: '#155A73',
			secondary: '#1B6B7D',
		},
	},
} satisfies StumpTheme
