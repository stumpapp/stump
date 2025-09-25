import { StumpTheme } from './types'

export const cosmic = {
	background: {
		DEFAULT: '#1C0F45',
		gradient: {
			from: '#300045',
			to: '#1C0F45',
		},
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
			hover: '#A15BBF',
			secondary: '#8E44AD26',
		},
		danger: {
			DEFAULT: '#FF4757',
			hover: '#FF707C',
			secondary: '#FF475726',
		},
		disabled: '#6C567B',
		info: {
			DEFAULT: '#3498DB',
			hover: '#57AAE1',
			secondary: '#3498DB26',
		},
		success: {
			DEFAULT: '#2ECC71',
			hover: '#4CD787',
			secondary: '#2ECC7126',
		},
		warning: {
			DEFAULT: '#F39C12',
			hover: '#F5AC39',
			secondary: '#F39C1226',
		},
		'on-black': {
			DEFAULT: '#242628',
			muted: '#242628',
		},
	},
	foreground: {
		DEFAULT: '#F4F2FF',
		brand: '#BB86FC',
		disabled: '#A29BCC',
		muted: '#A29BCC',
		'on-inverse': '#1C0F45',
		'on-black': {
			DEFAULT: '#F4F2FF',
			muted: '#A29BCC',
		},
		subtle: '#D1C5E5',
	},
	sidebar: {
		DEFAULT: '#130A30',
		gradient: {
			from: '#300045',
			to: '#130A30',
		},
		inverse: '#F4F2FF',
		overlay: {
			DEFAULT: '#1C0F45',
			hover: '#311E75',
		},
		surface: {
			DEFAULT: '#251556',
			hover: '#28175E',
			secondary: '#2A1969',
		},
	},
} satisfies StumpTheme
