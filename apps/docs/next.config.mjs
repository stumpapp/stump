import nextra from 'nextra'

const withNextra = nextra({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
})

export default withNextra({
	eslint: {
		// FIXME: This is a workaround to prevent the build from failing
		ignoreDuringBuilds: true,
	},
	typescript: {
		// FIXME: This is a workaround to prevent the build from failing
		ignoreBuildErrors: true,
	},
	// See https://gist.github.com/amcvitty/42cbe072184fe72485ad17cd7120bb89
	headers: async () => [
		{
			source: '/.well-known/apple-app-site-association',
			headers: [
				{
					key: 'Content-Type',
					value: 'application/json',
				},
			],
		},
	],
	redirects: async () => [
		{
			source: '/installation',
			destination: '/installation/docker',
			permanent: true,
		},
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
			source: '/guides/features/book-clubs',
			destination: '/guides/features/book-clubs/overview',
			permanent: true,
		},
		{
			source: '/guides/configuration',
			destination: '/guides/configuration/server-options',
			permanent: true,
		},
	],
})
