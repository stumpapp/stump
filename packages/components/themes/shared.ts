/**
 * A type for enforcing the structure of a color
 */
export type FullColor = {
	100: string
	200: string
	300: string
	400: string
	50: string
	500: string
	600: string
	700: string
	800: string
	900: string
	DEFAULT: string
}

/**
 * A type for enforcing the structure of a valid theme
 */
export type ThemeDefintion = {
	background: {
		100: string
		200: string
		300: string
		400: string
		500: string
		DEFAULT: string
		danger: string
		warning: string
	}
	brand: FullColor
	contrast: {
		100: string
		200: string
		300: string
		DEFAULT: string
	}
	edge: {
		200: string
		DEFAULT: string
	}
	muted: {
		100: string
		200: string
		DEFAULT: string
	}
	sidebar: {
		200: string
		300: string
		DEFAULT: string
	}
}

export const brand: FullColor = {
	100: '#EFDDD1',
	200: '#E4C6B3',
	300: '#D9AF95',
	400: '#CF9977',
	50: '#F4E8E0',
	500: '#C48259',
	600: '#A9663C',
	700: '#7F4D2D',
	800: '#56341F',
	900: '#2D1B10',
	DEFAULT: '#C48259',
}

export const red: FullColor = {
	100: '#FCDADA',
	200: '#F9B5B5',
	300: '#F58F8F',
	400: '#F26A6A',
	50: '#FDEDED',
	500: '#EF4444',
	600: '#E71414',
	700: '#B30F0F',
	800: '#800B0B',
	900: '#4C0707',
	DEFAULT: '#EF4444',
}

export const yellow: FullColor = {
	100: '#FDEFB5',
	200: '#FDE68D',
	300: '#FCDD65',
	400: '#FBD53D',
	50: '#FEF3C9',
	500: '#FACC15',
	600: '#D2A904',
	700: '#9B7D03',
	800: '#655102',
	900: '#2E2501',
	DEFAULT: '#FACC15',
}

export const amber: FullColor = {
	100: '#FBDCA8',
	200: '#FACD81',
	300: '#F8BD59',
	400: '#F7AE32',
	50: '#FCE4BB',
	500: '#F59E0B',
	600: '#C07C08',
	700: '#8A5906',
	800: '#543603',
	900: '#1E1401',
	DEFAULT: '#F59E0B',
}
