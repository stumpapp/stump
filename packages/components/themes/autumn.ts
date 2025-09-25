import { StumpTheme } from './types'

export const autumn = {
	background: {
		DEFAULT: '#2C1A12',
		inverse: '#FFFBF3',
		overlay: {
			DEFAULT: '#3B2D23',
			hover: '#4D3F33',
		},
		surface: {
			DEFAULT: '#422F25',
			hover: '#5A3F33',
			secondary: '#4B382D',
		},
	},
	edge: {
		DEFAULT: '#4B382D',
		brand: '#D0802D',
		danger: '#C53030',
		info: '#3B82F6',
		strong: '#FFFBF3',
		subtle: '#4D3F33',
		success: '#5B8B41',
		warning: '#F59E0B',
	},
	fill: {
		brand: {
			DEFAULT: '#D08732',
			hover: '#D0802D',
			secondary: '#D0873226',
		},
		danger: {
			DEFAULT: '#E25837',
			hover: '#E35F40',
			secondary: '#E2583726',
		},
		disabled: '#726A63',
		info: {
			DEFAULT: '#3B82F6',
			hover: '#5A9CF6',
			secondary: '#3B82F626',
		},
		success: {
			DEFAULT: '#7BC96F',
			hover: '#8CD37F',
			secondary: '#7BC96F26',
		},
		warning: {
			DEFAULT: '#FFB703',
			hover: '#FFB70326',
			secondary: '#FFB70326',
		},
		'on-black': {
			DEFAULT: '#242628',
			muted: '#242628',
		},
	},
	foreground: {
		DEFAULT: '#F7F0E4',
		brand: '#D0802D',
		disabled: '#A29A8D',
		muted: '#A29A8D',
		'on-inverse': '#2C1A12',
		'on-black': {
			DEFAULT: '#F7F0E4',
			muted: '#A29A8D',
		},
		subtle: '#E5DCC5',
	},
	sidebar: {
		DEFAULT: '#25160F',
		inverse: '#FFFBF3',
		overlay: {
			DEFAULT: '#2C1A12',
			hover: '#4D3F33',
		},
		surface: {
			DEFAULT: '#35281F',
			hover: '#3B2D23',
			secondary: '#4B382D',
		},
	},
} satisfies StumpTheme
