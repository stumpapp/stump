import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import browserCollections from 'collections/browser'
import Link from 'fumadocs-core/link'
import { useFumadocsLoader } from 'fumadocs-core/source/client'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	EditOnGitHub,
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
			lastModified: page.data.lastModified,
		}
	})

const clientLoader = browserCollections.docs.createClientLoader({
	component(
		{ toc, frontmatter, default: MDX },
		{
			// markdownUrl,
			path,
			lastModified,
		}: {
			markdownUrl: string
			path: string
			lastModified?: Date | null
		},
	) {
		return (
			<>
				<div className="inset-0 pointer-events-none absolute -z-10 h-full w-full overflow-x-clip">
					<div className="top-0 xl:right-1/2 right-0 bg-amber-500/10 max-md:hidden w-5xl h-256 pointer-events-none absolute -z-10 translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center,red,transparent_69%)] [webkit-mask-image:var(--mask)]" />
					<div className="top-0 xl:right-1/2 right-0 bg-amber-500/5 max-md:hidden w-5xl h-256 pointer-events-none fixed -z-10 translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center,red,transparent_69%)] [webkit-mask-image:var(--mask)]" />
					<div className="top-0 xl:right-1/2 right-0 bg-dot-matrix-xl max-md:hidden w-5xl h-256 pointer-events-none absolute -z-10 translate-x-1/2 -translate-y-1/2 [mask-image:var(--mask)] [--mask:radial-gradient(circle_at_center_top,red,transparent)] [webkit-mask-image:var(--mask)] dark:opacity-80" />
				</div>

				<DocsPage
					toc={toc}
					tableOfContent={{
						style: 'clerk',
					}}
				>
					{lastModified && (
						<p className="text-sm text-fd-muted-foreground -mb-4">
							Last updated on{' '}
							{Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(lastModified))}
						</p>
					)}
					<div className="mb-4 flex items-center justify-between">
						<div className="flex-1">
							<DocsTitle>{frontmatter.title}</DocsTitle>
							<DocsDescription>{frontmatter.description}</DocsDescription>
						</div>
						<div className="gap-2 flex items-center">
							<Link
								href={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`}
							>
								<EditOnGitHub />
							</Link>
						</div>
					</div>
					<DocsBody>
						<MDX components={useMDXComponents()} />
					</DocsBody>
				</DocsPage>
			</>
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
