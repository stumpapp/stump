import {
	clone as cloneColor,
	ColorSpace,
	getColor,
	OKLCH,
	serialize,
	set as setColor,
	sRGB,
	to,
} from 'colorjs.io/fn'
import clone from 'lodash/cloneDeep'
import setProperty from 'lodash/set'
import { Platform } from 'react-native'

import { usePreferencesStore } from '~/stores'

import { useColorScheme } from './useColorScheme'

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

export const IS_IOS_26_PLUS = Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 26

export const ON_END_REACHED_THRESHOLD = Platform.OS === 'ios' ? 0.75 : 0.6

// Note: These are vague categories that do not matter, and it doesn't matter
// if the setting fits the category name that well, as long as it looks good
export const SETTINGS_COLORS = {
	majorVisuals: '#be193a',
	minorVisuals: '#3287d5',
	interactive: '#1ea550',
	server: '#c46e07',
	data: '#3fa7a9',
	hiding: '#484395',
	destructive: '#fd6bd5',
}

export const STAT_COLORS = {
	inProgress: '#f59e0b', // amber-500
	completed: '#34d399', // emerald-400
	books: '#60a5fa', // blue-400
	series: '#c084fc', // purple-400
	readingTime: '#fb7185', // rose-400
	size: '#94a3b8', // slate-400
}

// TODO: android-specific tab bar color

const light = {
	background: {
		DEFAULT: '#ffffff',
		inverse: '#161719',
		overlay: {
			DEFAULT: '#f6f6f7',
			hover: 'rgb(0 0 0 / 0.05)',
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
	dots: {
		active: '#414347',
		inactive: '#d3d5d7',
	},
	header: {
		start: 'hsla(0, 0%, 100%, 0.6)',
		end: 'hsla(0, 0%, 100%, 0)',
	},
	thumbnail: {
		border: 'rgba(31, 33, 35, 0.10)',
		placeholder: '#F2F2F2',
		stack: {
			series: '#d4b7a7',
			library: ['#ad9282', '#d4b7a7'],
		},
	},
	slider: {
		minimumTrack: '#c48259',
		maximumTrack: '#d3d5d7',
	},
	sheet: {
		background: '#ffffff',
		grabber: '#ccc',
	},
	tabbar: '#f7f7f8',
}

type Theme = typeof light

const dark: Theme = {
	background: {
		DEFAULT: '#000000',
		inverse: '#ffffff',
		overlay: {
			DEFAULT: '#2d2d2d',
			hover: 'rgb(255 255 255 / 0.1)',
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
	dots: {
		active: '#f5f3ef',
		inactive: '#898d94',
	},
	header: {
		start: 'hsla(0, 0%, 0%, 0.8)',
		end: 'hsla(0, 0%, 0%, 0)',
	},
	thumbnail: {
		border: 'rgba(233, 234, 235, 0.10)',
		placeholder: '#1C1C1C',
		stack: {
			series: '#543c2f',
			library: ['#331e11', '#543c2f'],
		},
	},
	slider: {
		minimumTrack: '#cf9977',
		maximumTrack: '#292c30',
	},
	sheet: {
		background: '#000000',
		grabber: '#333',
	},
	tabbar: '#0B0B0B',
}

export const COLORS = {
	light,
	dark,
}

export const useColors = () => {
	const { isDarkColorScheme } = useColorScheme()
	const accentColor = usePreferencesStore((state) => state.accentColor)
	const resolvedTheme = clone(isDarkColorScheme ? dark : light)

	if (accentColor) {
		const color = getColor(accentColor)

		setProperty(resolvedTheme, 'foreground.brand', accentColor)
		setProperty(resolvedTheme, 'fill.brand.DEFAULT', accentColor)
		setProperty(resolvedTheme, 'slider.minimumTrack', accentColor)

		const hoverColor = cloneColor(color)
		setColor(hoverColor, { 'oklch.l': (l) => l + (isDarkColorScheme ? 0.08 : -0.08) })
		setProperty(resolvedTheme, 'fill.brand.hover', serialize(hoverColor, { format: 'hex' }))

		const secondaryColor = cloneColor(color)
		secondaryColor.alpha = isDarkColorScheme ? 0.21 : 0.15
		setProperty(resolvedTheme, 'fill.brand.secondary', serialize(secondaryColor, { format: 'hex' }))

		const oklchColor = to(color, OKLCH)
		const lightness = oklchColor.coords[0]

		const contrastColor = lightness > 0.6 ? '#161719' : '#ffffff'
		setProperty(resolvedTheme, 'foreground.on.fill', contrastColor)
	}

	return resolvedTheme
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
