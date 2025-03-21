import { useColorScheme } from './useColorScheme'

const light = {
	background: {
		DEFAULT: '#ffffff',
		inverse: '#161719',
		overlay: {
			DEFAULT: '#f6f6f7',
			hover: '#e9eaeb',
		},
		surface: {
			DEFAULT: '#f7f7f8',
			hover: '#ececee',
			secondary: '#f2f2f3',
		},
		opaque: 'hsla(0, 0%, 100%, 0.65)',
	},
	edge: {
		DEFAULT: '#e9eaeb',
		brand: '#cf9977',
		danger: '#b02a29',
		info: '#3f89ca',
		strong: '#ffffff',
		subtle: '#d3d5d7',
		success: '#2e7d32',
		warning: '#d8a219',
	},
	fill: {
		brand: {
			DEFAULT: '#c48259',
			hover: '#a9663c',
			secondary: '#c4825926',
		},
		danger: {
			DEFAULT: '#e53935',
			hover: '#c81e1a',
			secondary: '#e5393526',
		},
		disabled: '#71757d',
		info: {
			DEFAULT: '#3f89ca',
			hover: '#2d6ca4',
			secondary: '#3f89ca26',
		},
		success: {
			DEFAULT: '#43a047',
			hover: '#327835',
			secondary: '#43a04726',
		},
		warning: {
			DEFAULT: '#f59e0b',
			hover: '#c07c08',
			secondary: '#f59e0b26',
		},
	},
	foreground: {
		DEFAULT: '#000000',
		brand: '#c48259',
		disabled: '#93979d',
		muted: '#414347',
		on: {
			inverse: '#161719',
			fill: '#ffffff',
		},
		subtle: '#26272a',
	},
}

type Theme = typeof light

const dark: Theme = {
	background: {
		DEFAULT: '#000000',
		inverse: '#ffffff',
		overlay: {
			DEFAULT: '#111113',
			hover: '#17171a',
		},
		surface: {
			DEFAULT: '#0a0a0a',
			hover: '#242628',
			secondary: '#1f2123',
		},
		opaque: 'hsla(0, 0%, 0%, 0.65)',
	},
	edge: {
		DEFAULT: '#1f2123',
		brand: '#cf9977',
		danger: '#b02a29',
		info: '#3f89ca',
		strong: '#ffffff',
		subtle: '#292c30',
		success: '#2e7d32',
		warning: '#d8a219',
	},
	fill: {
		brand: {
			DEFAULT: '#c48259',
			hover: '#cf9977',
			secondary: '#c4825926',
		},
		danger: {
			DEFAULT: '#e53935',
			hover: '#ea5c59',
			secondary: '#e5393526',
		},
		disabled: '#71757d',
		info: {
			DEFAULT: '#3f89ca',
			hover: '#5f9dd3',
			secondary: '#3f89ca26',
		},
		success: {
			DEFAULT: '#43a047',
			hover: '#54b859',
			secondary: '#43a04726',
		},
		warning: {
			DEFAULT: '#f59e0b',
			hover: '#f7ae32',
			secondary: '#f59e0b26',
		},
	},
	foreground: {
		DEFAULT: '#f5f3ef',
		brand: '#c48259',
		disabled: '#898d94',
		muted: '#898d94',
		on: {
			inverse: '#161719',
			fill: '#ffffff',
		},
		subtle: '#e9eaeb',
	},
}

export const COLORS = {
	light,
	dark,
}

export const useColors = () => {
	const { isDarkColorScheme } = useColorScheme()
	return isDarkColorScheme ? dark : light
}

export const NAV_THEME = {
	light: {
		background: 'hsl(0 0% 100%)', // background
		border: 'hsl(240 5.9% 90%)', // border
		card: 'hsl(0 0% 100%)', // card
		notification: 'hsl(0 84.2% 60.2%)', // destructive
		primary: 'hsl(240 5.9% 10%)', // primary
		text: 'hsl(240 10% 3.9%)', // foreground
	},
	dark: {
		background: 'hsl(240 10% 3.9%)', // background
		border: 'hsl(240 3.7% 15.9%)', // border
		card: 'hsl(240 10% 3.9%)', // card
		notification: 'hsl(0 72% 51%)', // destructive
		primary: 'hsl(0 0% 98%)', // primary
		text: 'hsl(0 0% 98%)', // foreground
	},
}
