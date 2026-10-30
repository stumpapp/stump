import { Breadcrumbs } from '@stump/components'

import { DocsLinkButton } from './DocsLinkButton'
import { EntityCrumb } from './EntityHeader'
import { PageHeader } from './PageHeader'

type Props = {
	/** the collection the new entity belongs to, e.g. `Libraries` */
	parent: EntityCrumb
	title: string
	docsLink?: string
}

/** the page header for creation flows, i.e. `Parent > Create Thing` */
export function CreateSceneHeader({ parent, title, docsLink }: Props) {
	return (
		<PageHeader>
			<PageHeader.Start>
				<Breadcrumbs segments={[{ ...parent, noShrink: true }, { label: title }]} />
			</PageHeader.Start>

			{docsLink && (
				<PageHeader.End>
					<DocsLinkButton href={docsLink} />
				</PageHeader.End>
			)}
		</PageHeader>
	)
}
