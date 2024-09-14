import { StumpTheme } from './types'

export const cosmic = {
	background: {
		DEFAULT: '#1C0F45',
		inverse: '#F4F2FF',
		overlay: {
			DEFAULT: '#28175E',
			hover: '#311E75',
		},
		surface: {
			DEFAULT: '#24135A',
			hover: '#321E77',
			secondary: '#2A1969',
		},
	},
	edge: {
		DEFAULT: '#2A1969',
		brand: '#BB86FC',
		danger: '#FF4757',
		info: '#3498DB',
		strong: '#F4F2FF',
		subtle: '#311E75',
		success: '#2ECC71',
		warning: '#F39C12',
	},
	fill: {
		brand: {
			DEFAULT: '#8E44AD',
			secondary: '#8E44AD26',
		},
		danger: {
			DEFAULT: '#FF4757',
			secondary: '#FF475726',
		},
		disabled: '#6C567B',
		info: {
			DEFAULT: '#3498DB',
			secondary: '#3498DB26',
		},
		success: {
			DEFAULT: '#2ECC71',
			secondary: '#2ECC7126',
		},
		warning: {
			DEFAULT: '#F39C12',
			secondary: '#F39C1226',
		},
	},
	foreground: {
		DEFAULT: '#F4F2FF',
		disabled: '#A29BCC',
		muted: '#A29BCC',
		'on-inverse': '#1C0F45',
		subtle: '#D1C5E5',
	},
	sidebar: {
		DEFAULT: '#1C0F45',
		inverse: '#F4F2FF',
		overlay: {
			DEFAULT: '#1C0F45',
			hover: '#311E75',
		},
		surface: {
			DEFAULT: '#28175E',
			hover: '#311E75',
			secondary: '#24135A',
		},
	},
} satisfies StumpTheme
