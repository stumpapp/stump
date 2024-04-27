import { brand, red, ThemeDefintion, yellow } from './shared'

export const light: ThemeDefintion = {
	background: {
		100: '#FFFFFF',
		200: '#F6F6F7',
		300: '#E9EAEB',
		400: '#D3D5D7',
		500: '#BEC0C4',
		DEFAULT: '#FFFFFF',
		danger: red[50],
		warning: yellow[50],
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
		200: '#D3D5D7',
		DEFAULT: '#E9EAEB',
	},
	muted: {
		100: '#7D828A',
		200: '#93979D',
		DEFAULT: '#7D828A',
	},
	sidebar: {
		200: '#E9EAEB',
		300: '#D3D5D7',
		DEFAULT: '#F6F6F7',
	},
}
