import { defineConfig, defineDocs } from 'fumadocs-mdx/config'

export const docs = defineDocs({
	dir: 'content/docs',
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
		// messes with styles...
		// mdxOptions: {
		// 	remarkPlugins: [remarkSteps],
		// },
	},
})

export default defineConfig()
