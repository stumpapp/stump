import nextra from 'nextra'

const withNextra = nextra({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
})

export default withNextra({
	typescript: {
		// TODO(vercel): For some reason, no type errors are present locally but they are on Vercel and totally
		// break the build. This should be a temporary fix until the root cause is found.
		ignoreBuildErrors: true,
	},
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
