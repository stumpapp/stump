// @ts-expect-error: idk y though
const withNextra = require('nextra')({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
})

module.exports = {
	...withNextra(),
	async redirects() {
		return [
			{
				destination: '/installation/getting-started',
				permanent: true,
				source: '/installation',
			},
			{
				destination: '/guides/overview',
				permanent: true,
				source: '/guides',
			},
		]
	},
}
