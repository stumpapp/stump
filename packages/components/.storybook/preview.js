import '../src/styles/tailwind.css'
import '../src/styles/preview.css'
import '../src/styles/overrides.css'

import { withThemeByClassName } from '@storybook/addon-themes'

export const decorators = [
	withThemeByClassName({
		themes: {
			light: 'light',
			dark: 'dark',
		},
		defaultTheme: 'dark',
	}),
]

export const parameters = {
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
}
