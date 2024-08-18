import { light } from './light'
import { StumpTheme } from './types'

export const bronze = {
	background: {
		DEFAULT: '#FFFFFF',
		inverse: light.background.inverse,
		overlay: {
			DEFAULT: '#FBFAF9',
			hover: '#EDE8E4',
		},
		surface: {
			DEFAULT: '#EDE8E4',
			hover: '#E0D6CF',
			secondary: '#D3C4BA',
		},
	},
	edge: {
		...light.edge,
		DEFAULT: '#EDE8E4',
		subtle: '#D3C4BA',
	},
	fill: light.fill,
	foreground: light.foreground,
	sidebar: {
		DEFAULT: '#F3F0ED',
		inverse: light.sidebar.inverse,
		overlay: {
			DEFAULT: '#FFFFFF',
			hover: '#F5F2F0',
		},
		surface: {
			DEFAULT: '#EDE8E4',
			hover: '#E0D6CF',
			secondary: '#D3C4BA',
		},
	},
} satisfies StumpTheme
