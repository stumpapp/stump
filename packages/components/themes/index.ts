import { bronze } from './bronze'
import { dark } from './dark'
import { light } from './light'

const brand = {
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

const gray = {
	100: '#D3D5D7',
	1000: '#101112',
	150: '#C8CACD',
	200: '#BEC0C4',
	250: '#B2B5B9',
	300: '#A8ACB0',
	350: '#9DA1A6',
	400: '#93979D',
	450: '#898D94',
	50: '#F6F6F7',
	500: '#7D828A',
	550: '#71757D',
	600: '#62666D',
	650: '#565A5F',
	700: '#484B4F',
	75: '#E9EAEB',
	750: '#3C3E42',
	800: '#2D2F32',
	850: '#252729',
	900: '#202224',
	950: '#1B1C1E',
	975: '#161719',
	DEFAULT: '#7D828A',
}

export const sharedColors = {
	brand,
	gray,
}

export const themes = {
	bronze,
	dark,
	light,
}

export type Theme = keyof typeof themes
