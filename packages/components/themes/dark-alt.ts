import { dark } from './dark'
import { StumpTheme } from './types'

const brand = {
	DEFAULT: '#1D38B2',
	hover: '#2343D5',
}

export const darkalt: StumpTheme = {
	...dark,
	edge: {
		...dark.edge,
		brand: brand.DEFAULT,
		focus: brand.DEFAULT,
	},
	fill: {
		...dark.fill,
		brand: {
			DEFAULT: brand.DEFAULT,
			hover: brand.hover,
			secondary: `${brand.DEFAULT}26`,
		},
	},
	foreground: {
		...dark.foreground,
		brand: brand.DEFAULT,
	},
}
