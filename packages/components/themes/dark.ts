import { brand, ThemeDefintion } from './shared'

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
