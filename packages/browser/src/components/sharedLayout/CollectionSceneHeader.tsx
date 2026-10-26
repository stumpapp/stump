import {
	Breadcrumbs,
	Button,
	DropdownMenu,
	DropdownMenuProps,
	MiniStatCard,
} from '@stump/components'
import { EllipsisVertical } from 'lucide-react'

import { DocsLinkButton } from './DocsLinkButton'
import { PageHeader } from './PageHeader'

type Stat = React.ComponentProps<typeof MiniStatCard> & { key: string }

type Props = {
	title: string
	stats?: Stat[]
	actions?: DropdownMenuProps['groups']
	docsLink?: string
}

/** the page header for top-level collection pages, e.g. `Libraries` */
export function CollectionSceneHeader({ title, actions, stats, docsLink }: Props) {
	return (
		<PageHeader>
			<PageHeader.Start>
				<Breadcrumbs segments={[{ label: title, noShrink: true }]} />

				{!!actions?.length && (
					<DropdownMenu
						align="start"
						contentWrapperClassName="w-48"
						trigger={
							<Button variant="ghost" size="icon" className="size-7 shrink-0">
								<EllipsisVertical className="h-4 w-4" />
							</Button>
						}
						groups={actions}
					/>
				)}

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
