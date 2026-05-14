import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import browserCollections from 'collections/browser'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	EditButton,
	EditOnGitHub,
	MarkdownCopyButton,
	ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page'
import { Suspense } from 'react'

import { useMDXComponents } from '@/components/mdx'
import { baseOptions } from '@/lib/layout.shared'
import { gitConfig } from '@/lib/shared'
import { slugsToMarkdownPath, source } from '@/lib/source'

export const Route = createFileRoute('/docs/$')({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split('/') ?? []
		const data = await serverLoader({ data: slugs })
		await clientLoader.preload(data.path)
		return data
	},
})

const serverLoader = createServerFn({
	method: 'GET',
})
	.inputValidator((slugs: string[]) => slugs)
	.handler(async ({ data: slugs }) => {
		const page = source.getPage(slugs)
		if (!page) throw notFound()

		return {
			path: page.path,
			markdownUrl: slugsToMarkdownPath(page.slugs).url,
			pageTree: await source.serializePageTree(source.getPageTree()),
		}
	})

const clientLoader = browserCollections.docs.createClientLoader({
	component(
		{ toc, frontmatter, default: MDX },
		// you can define props for the component
		{
			markdownUrl,
			path,
		}: {
			markdownUrl: string
			path: string
		},
	) {
		return (
			<DocsPage
				toc={toc}
				tableOfContent={{
					style: 'clerk',
				}}
			>
				{/*{page.data.lastModified && (
					<p className="text-sm text-fd-muted-foreground -mb-4">
						Last updated on{' '}
						{Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(
							new Date(page.data.lastModified),
						)}
					</p>
				)}*/}
				<div className="mb-4 flex items-center justify-between">
					<div className="flex-1">
						<DocsTitle>{frontmatter.title}</DocsTitle>
						<DocsDescription>{frontmatter.description}</DocsDescription>
					</div>
					<div className="gap-2 flex items-center">
						<EditOnGitHub
							githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
						/>
					</div>
				</div>
				<DocsBody>
					<MDX components={useMDXComponents()} />
				</DocsBody>
			</DocsPage>
		)
	},
})

function Page() {
	const { path, pageTree, markdownUrl } = useFumadocsLoader(Route.useLoaderData())

	return (
		<DocsLayout {...baseOptions()} tree={pageTree}>
			<Suspense>{clientLoader.useContent(path, { markdownUrl, path })}</Suspense>
		</DocsLayout>
	)
}
