import { dark } from './dark'
import { StumpTheme } from './types'

export const light = {
	background: {
		DEFAULT: '#FFFFFF',
		inverse: dark.background.DEFAULT,
		overlay: {
			DEFAULT: '#F6F6F7',
			hover: '#E9EAEB',
		},
		surface: {
			DEFAULT: '#F7F7F8',
			hover: '#ECECEE',
			secondary: '#F2F2F3',
		},
	},
	edge: {
		DEFAULT: '#E9EAEB',
		brand: '#CF9977',
		danger: '#b02a29',
		info: '#3F89CA',
		strong: '#FFFFFF',
		subtle: '#D3D5D7',
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
		DEFAULT: '#000000',
		disabled: '#93979D',
		muted: '#414347',
		// #5B5F65 OR #7D828A
		'on-inverse': dark.foreground.DEFAULT,
		subtle: '#26272A',
	},
	sidebar: {
		DEFAULT: '#F9F9F9',
		inverse: '#000000',
		overlay: {
			DEFAULT: '#FFFFFF',
			hover: '#F6F6F7',
		},
		surface: {
			DEFAULT: '#F6F6F7',
			hover: '#EBEBED',
			secondary: '#F1F1F2',
		},
	},
} satisfies StumpTheme
