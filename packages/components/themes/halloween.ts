import { dark } from './dark'
import { StumpTheme } from './types'

// TODO: fix before october, this is ass
export const halloween: StumpTheme = {
	background: {
		DEFAULT: '#0C0C0C',
		inverse: '#FFFFFF',
		overlay: {
			DEFAULT: '#1A1A1A',
			hover: '#333333',
		},
		surface: {
			DEFAULT: '#131313',
			hover: '#161616',
			secondary: '#FF6600',
		},
	},
	edge: {
		DEFAULT: '#FF660040',
		brand: '#FF660080',
		subtle: '#FF660060',
	},
	fill: {
		...dark.fill,
		brand: {
			DEFAULT: '#481E14',
			secondary: '#481E1480',
		},
	},
	foreground: dark.foreground,
	sidebar: {
		DEFAULT: '#090909',
		inverse: '#FFFFFF',
		surface: {
			DEFAULT: '#131313',
			hover: '#161616',
			secondary: '#00000040',
		},
	},
}
