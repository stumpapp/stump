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
				destination: '/guides/getting-started',
				permanent: true,
				source: '/guides',
			},
			{
				destination: '/guides/access-control/age-restrictions',
				permanent: true,
				source: '/guides/access-control',
			},
			{
				destination: '/guides/basics/books',
				permanent: true,
				source: '/guides/basics',
			},
			{
				destination: '/guides/book-clubs/overview',
				permanent: true,
				source: '/guides/book-clubs',
			},
			{
				destination: '/guides/configuration/server-options',
				permanent: true,
				source: '/guides/configuration',
			},
			{
				destination: '/guides/desktop/overview',
				permanent: true,
				source: '/guides/desktop',
			},
		]
	},
}
