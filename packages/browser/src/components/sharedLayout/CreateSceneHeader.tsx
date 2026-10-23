import { Breadcrumbs, ToolTip } from '@stump/components'
import { BookOpenText } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

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
	const { translate } = useTranslate()

	return (
		<PageHeader>
			<PageHeader.Start>
				<Breadcrumbs segments={[{ ...parent, noShrink: true }, { label: title }]} />
			</PageHeader.Start>

			{docsLink && (
				<PageHeader.End>
					<ToolTip content={translate('shared.common.documentation')} side="left">
						<a
							href={docsLink}
							target="_blank"
							rel="noreferrer"
							aria-label={translate('shared.common.documentation')}
							className="size-7 flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<BookOpenText className="h-4 w-4" />
						</a>
					</ToolTip>
				</PageHeader.End>
			)}
		</PageHeader>
	)
}
