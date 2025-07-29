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
			DEFAULT: '#165564',
			hover: '#186070',
			secondary: '#227E95',
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
			hover: '#0A9396',
			secondary: '#0A939626',
		},
		danger: {
			DEFAULT: '#E63946',
			hover: '#EC4A53',
			secondary: '#E6394626',
		},
		disabled: '#577590',
		info: {
			DEFAULT: '#0096C7',
			hover: '#0096C7',
			secondary: '#0096C726',
		},
		success: {
			DEFAULT: '#43AA8B',
			hover: '#4FBBA9',
			secondary: '#43AA8B26',
		},
		warning: {
			DEFAULT: '#F77F00',
			hover: '#FF8C00',
			secondary: '#F77F0026',
		},
		'on-black': {
			DEFAULT: '#242628',
			muted: '#242628',
		},
	},
	foreground: {
		DEFAULT: '#EDF2F4',
		brand: '#0A9396',
		disabled: '#94A1AC',
		muted: '#94A1AC',
		'on-inverse': '#0B3D4D',
		'on-black': {
			DEFAULT: '#EDF2F4',
			muted: '#B0B3B7',
		},
		subtle: '#D9E4EA',
	},
	sidebar: {
		DEFAULT: '#0A3644', // or #093240?
		inverse: '#E8F9FF',
		overlay: {
			DEFAULT: '#0B3D4D',
			hover: '#155A73',
		},
		surface: {
			DEFAULT: '#12455B',
			hover: '#14576F',
			secondary: '#1B6B7D',
		},
	},
} satisfies StumpTheme
