import nextra from 'nextra'

const withNextra = nextra({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
})

export default withNextra({
	redirects: async () => [
		{
			source: '/guides/access-control',
			destination: '/guides/access-control/age-restrictions',
			permanent: true,
		},
		{
			source: '/guides/basics',
			destination: '/guides/basics/books',
			permanent: true,
		},
		{
			source: '/guides/book-clubs',
			destination: '/guides/book-clubs/overview',
			permanent: true,
		},
		{
			source: '/guides/configuration',
			destination: '/guides/configuration/server-options',
			permanent: true,
		},
	],
})
