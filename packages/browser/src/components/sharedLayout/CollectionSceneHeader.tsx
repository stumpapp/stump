import { Breadcrumbs, MiniStatCard } from '@stump/components'

import { DocsLinkButton } from './DocsLinkButton'
import { PageHeader } from './PageHeader'

type Stat = React.ComponentProps<typeof MiniStatCard> & { key: string }

type Props = {
	title: string
	stats?: Stat[]
	docsLink?: string
}

/** the page header for top-level collection pages, e.g. `Libraries` */
export function CollectionSceneHeader({ title, stats, docsLink }: Props) {
	return (
		<PageHeader>
			<PageHeader.Start>
				<Breadcrumbs segments={[{ label: title, noShrink: true }]} />

				{stats && (
					<div className="sm:flex gap-2 hidden shrink-0 items-center">
						{stats.map(({ key, ...stat }) => (
							<MiniStatCard key={key} {...stat} />
						))}
					</div>
				)}
			</PageHeader.Start>

			{docsLink && (
				<PageHeader.End>
					<DocsLinkButton href={docsLink} />
				</PageHeader.End>
			)}
		</PageHeader>
	)
}
