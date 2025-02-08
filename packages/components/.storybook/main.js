/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path')

module.exports = {
	stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
		// FIXME: I want storybook-dark-mode ideally because it toggles all of the storybook UI
		// accordingly, but their logic for toggling dark mode is broken. So for now I am using
		// storybook-tailwind-dark-mode, but it doesn't toggle the storybook UI (just the dark class)
		// 'storybook-dark-mode',
		'storybook-tailwind-dark-mode',
		// NOTE: this wasn't working, workaround is to use webpackFinal below.
		// {
		// 	name: '@storybook/addon-postcss',
		// 	options: {
		// 		postcssLoaderOptions: {
		// 			implementation: require('postcss'),
		// 		},
		// 	},
		// },
	],

	webpackFinal: async (config) => {
		config.module.rules.push({
			test: /\.css$/,
			use: [
				{
					loader: 'postcss-loader',
					options: {
						postcssOptions: {
							plugins: [require('tailwindcss'), require('autoprefixer')],
						},
					},
				},
			],
			include: path.resolve(__dirname, '../'),
		})

		return config
	},

	framework: {
		name: '@storybook/react-webpack5',
		options: {},
	},

	docs: {
		autodocs: true,
	},
}
