import { useQuery, useSDK } from '@stump/client'
import { Label, Text } from '@stump/components'

import paths from '@/paths'

import { EntityCard } from '../entity'

type Props = {
	container?: (children: React.ReactNode) => React.ReactNode
}

export default function LastVisitedLibrary({ container }: Props) {
	const { sdk } = useSDK()
	const { data: library } = useQuery([sdk.library.keys.getLastVisited], sdk.library.getLastVisited)

	if (!library) {
		return null
	}

	const renderContent = () => {
		return (
			<div className="flex flex-col gap-y-2">
				<Label className="text-sm">Last visited</Label>
				<EntityCard
					href={paths.librarySeries(library.id)}
					imageUrl={sdk.library.thumbnailURL(library.id)}
					isCover
					className="flex-auto flex-shrink-0"
					fullWidth={(imageFailed) => !imageFailed}
				/>

				<Text className="line-clamp-1 text-sm" variant="muted">
					{library.name}
				</Text>
			</div>
		)
	}

	if (container) {
		return container(renderContent())
	}

	return renderContent()
}
