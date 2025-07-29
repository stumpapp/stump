import { dark } from './dark'
import { StumpTheme } from './types'

// TODO: fix before october, this is ass
export const pumpkin: StumpTheme = {
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
		...dark.edge,
		// DEFAULT: '#FF660030',
		// brand: '#FF660080',
		// subtle: '#FF660060',
		DEFAULT: '#631C0370',
		brand: '#631C0390',
		subtle: '#631C0380',
	},
	fill: {
		...dark.fill,
		brand: {
			DEFAULT: '#481E14',
			hover: '#34160E',
			secondary: '#481E1480',
		},
		info: {
			DEFAULT: '#FF6600',
			hover: '#AC7FDC',
			secondary: '#FF660040',
		},
	},
	foreground: {
		...dark.foreground,
		DEFAULT: '#F0C4AE',
		muted: '#E7A17F',
		subtle: '#ECB69A',
		// DEFAULT: '#F85C25',
		// DEFAULT: '#DE9887',
		// muted: '#883926',
		// subtle: '#F84D11',
		'on-black': {
			DEFAULT: '#F0C4AE',
			muted: '#E7A17F',
		},
	},
	sidebar: {
		DEFAULT: '#090909',
		inverse: '#FFFFFF',
		overlay: {
			DEFAULT: '#1A1A1A',
			hover: '#333333',
		},
		surface: {
			DEFAULT: '#131313',
			hover: '#161616',
			secondary: '#00000040',
		},
	},
}

/*
Potentials:

#9B3922
#A04747
#FF6000
#631C03
#CC6148

'brown-bramble': {  DEFAULT: '#631C03',  50: '#F85C25',  100: '#F84D11',  200: '#DA3E07',  300: '#B23205',  400: '#8B2704',  500: '#631C03',  600: '#2D0D01',  700: '#000000',  800: '#000000',  900: '#000000',  950: '#000000'},

'jambalaya': {  DEFAULT: '#4D240F',  50: '#F0C4AE',  100: '#EAAE90',  200: '#DE8254',  300: '#C55B26',  400: '#893F1A',  500: '#4D240F',  600: '#1E0E06',  700: '#000000',  800: '#000000',  900: '#000000',  950: '#000000'},
*/
