import { StumpTheme } from './types'

export const dark = {
	background: {
		DEFAULT: '#161719',
		inverse: '#FFFFFF',
		overlay: {
			DEFAULT: '#1D1B1B',
			hover: '#222020',
		},
		surface: {
			DEFAULT: '#1B1C1D',
			hover: '#242628',
			secondary: '#1F2123',
		},
	},
	edge: {
		DEFAULT: '#1F2123',
		brand: '#CF9977',
		danger: '#b02a29',
		info: '#3F89CA',
		strong: '#FFFFFF',
		subtle: '#292C30',
		success: '#2E7D32',
		warning: '#D8A219',
	},
	fill: {
		brand: {
			DEFAULT: '#C48259',
			secondary: '#C4825926',
		},
		danger: {
			DEFAULT: '#E53935',
			secondary: '#E5393526',
		},
		disabled: '#71757D',
		info: {
			DEFAULT: '#3F89CA',
			secondary: '#3F89CA26',
		},
		success: {
			DEFAULT: '#43A047',
			secondary: '#43A04726',
		},
		warning: {
			DEFAULT: '#F59E0B',
			secondary: '#F59E0B26',
		},
	},
	foreground: {
		DEFAULT: '#F5F3EF',
		disabled: '#898D94',
		muted: '#898D94',
		'on-inverse': '#161719',
		subtle: '#E9EAEB',
	},
	sidebar: {
		DEFAULT: '#151517',
		inverse: '#FFFFFF',
		overlay: {
			DEFAULT: '#151517',
			hover: '#17171A',
		},
		surface: {
			DEFAULT: '#19191B',
			hover: '#1E1E20',
			secondary: '#1B1B1E',
		},
	},
} satisfies StumpTheme
