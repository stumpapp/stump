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
			hover: '#A9663C',
			secondary: '#C4825926',
		},
		danger: {
			DEFAULT: '#E53935',
			hover: '#C81E1A',
			secondary: '#E5393526',
		},
		disabled: '#71757D',
		info: {
			DEFAULT: '#3F89CA',
			hover: '#2D6CA4',
			secondary: '#3F89CA26',
		},
		success: {
			DEFAULT: '#43A047',
			hover: '#327835',
			secondary: '#43A04726',
		},
		warning: {
			DEFAULT: '#F59E0B',
			hover: '#C07C08',
			secondary: '#F59E0B26',
		},
		'on-black': {
			DEFAULT: '#242628',
			muted: '#242628',
		},
	},
	foreground: {
		DEFAULT: '#000000',
		brand: '#C48259',
		disabled: '#93979D',
		muted: '#414347',
		// #5B5F65 OR #7D828A
		'on-inverse': dark.foreground.DEFAULT,
		'on-black': {
			DEFAULT: '#E9EAEB',
			muted: '#B0B3B7',
		},
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
