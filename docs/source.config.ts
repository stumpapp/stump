import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import lastModified from 'fumadocs-mdx/plugins/last-modified'

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

export default defineConfig({ plugins: [lastModified()] })
