import { brand, ThemeDefintion } from './shared'
import { StumpTheme } from './types'

export const dark: ThemeDefintion = {
	background: {
		100: '#161719',
		200: '#1B1C1D',
		300: '#1F2123',
		400: '#242628',
		500: '#292C30',
		DEFAULT: '#161719',
		danger: '#491B1C',
		warning: '#412E19',
	},
	brand,
	contrast: {
		100: '#FFFFFF',
		200: '#FBFAF9',
		300: '#F6F6F7',
		400: '#E9EAEB',
		DEFAULT: '#FFFFFF',
	},
	edge: {
		200: '#292C30',
		DEFAULT: '#1F2123',
	},
	muted: {
		100: '#898D94',
		200: '#71757D',
		DEFAULT: '#898D94',
	},
	sidebar: {
		200: '#161718',
		300: '#1F2123',
		DEFAULT: '#151517',
	},
}

export const updatedDark = {
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
			hover: '#17171A', // #1A1A1C?
		},
		surface: {
			DEFAULT: '#19191B',
			hover: '#1E1E20',
			secondary: '#1B1B1E',
		},
	},
} satisfies StumpTheme

/*

'woodsmoke': {
  DEFAULT: '#151517',
  50: '#2A2A2E',
  100: '#28282C',
  200: '#26262A',
  300: '#242427',
  400: '#212124',
  500: '#1F1F22',
  600: '#1C1C1F',
  700: '#1A1A1C',
  800: '#17171A',
  900: '#151517',
  950: '#080808'
},

*/
