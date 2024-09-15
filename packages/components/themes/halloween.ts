import { StumpTheme } from './types'

// TODO: fix before october, this is ass
export const halloween: StumpTheme = {
	background: {
		DEFAULT: '#000000',
		inverse: '#FFFFFF',
		overlay: {
			DEFAULT: '#1A1A1A',
			hover: '#333333',
		},
		surface: {
			DEFAULT: '#1A1A1A',
			hover: '#333333',
			secondary: '#FF6600',
		},
	},
	edge: {
		DEFAULT: '#FF660040',
		brand: '#FF660080',
	},
	foreground: {
		DEFAULT: '#F4F2FF',
	},
	sidebar: {
		DEFAULT: '#000000',
		inverse: '#FFFFFF',
		surface: {
			DEFAULT: '#00000080',
			hover: '#00000060',
			secondary: '#00000040',
		},
	},
}
