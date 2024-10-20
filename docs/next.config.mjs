import nextra from 'nextra'

const withNextra = nextra({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
})

export default withNextra({
	redirects: async () => [
		{
			source: '/docs',
			destination: '/docs/getting-started',
			permanent: true,
		},
		{
			source: '/docs/installation',
			destination: '/docs/getting-started',
			permanent: true,
		},
		{
			source: '/docs/guides',
			destination: '/docs/getting-started',
			permanent: true,
		},
		{
			source: '/docs/guides/access-control',
			destination: '/docs/access-control/age-restrictions',
			permanent: true,
		},
		{
			source: '/docs/guides/basics',
			destination: '/docs/basics/books',
			permanent: true,
		},
		{
			source: '/docs/guides/book-clubs',
			destination: '/docs/book-clubs/overview',
			permanent: true,
		},
		{
			source: '/docs/guides/configuration',
			destination: '/docs/configuration/server-options',
			permanent: true,
		},
		{
			source: '/docs/guides/desktop',
			destination: '/docs/desktop/overview',
			permanent: true,
		},
	],
})
