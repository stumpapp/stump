import { themes } from '@storybook/theming'

import '../styles/tailwind.css'
// import '../styles/storybook.css'

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
		// darkClass: 'dark',
		// classTarget: 'html',
	},
}
