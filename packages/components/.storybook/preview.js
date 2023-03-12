import { themes } from '@storybook/theming'

import '../src/styles/tailwind.css'
import '../src/styles/preview.css'

// TODO: I think the dark variants are being purged? I honestly don't know, but
// dark mode toggle isn't working and it is so annoying.
export const parameters = {
	actions: { argTypesRegex: '^on[A-Z].*' },
	controls: {
		matchers: {
			color: /(background|color)$/i,
			date: /Date$/,
		},
	},
	darkMode: {
		dark: {
			...themes.dark,
			appContentBg: '#171717',
			textColor: '#f5f5f5',
		},
		light: themes.normal,
		darkClass: 'dark',
		classTarget: 'body',
	},
}
