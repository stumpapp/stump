import { amber, brand, red, ThemeDefintion } from './shared'

export const bronze: ThemeDefintion = {
	background: {
		100: '#FFFFFF',
		200: '#FBFAF9',
		300: '#EDE8E4',
		400: '#E0D6CF',
		500: '#D3C4BA',
		DEFAULT: '#FFFFFF',
		danger: red[50],
		warning: amber[50],
	},
	brand,
	contrast: {
		100: '#000000',
		200: '#161719',
		300: '#1F2123',
		400: '#2E3033',
		DEFAULT: '#000000',
	},
	edge: {
		200: '#E7E0DA',
		DEFAULT: '#EDE8E4',
	},
	muted: {
		100: '#7D828A',
		200: '#93979D',
		DEFAULT: '#7D828A',
	},
	sidebar: {
		200: '#EDE8E4',
		300: '#E0D6CF',
		DEFAULT: '#F3F0ED',
	},
}
