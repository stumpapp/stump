import { getLibraryThumbnail, libraryApi, libraryQueryKeys } from '@stump/api'
import { useQuery } from '@stump/client'
import { EntityCard, Label, Text } from '@stump/components'
import React from 'react'

import paths from '@/paths'

type Props = {
	container?: (children: React.ReactNode) => React.ReactNode
}
export default function LastVisitedLibrary({ container }: Props) {
	const { data: library } = useQuery([libraryQueryKeys.getLastVisitedLibrary], async () => {
		const { data } = await libraryApi.getLastVisitedLibrary()
		return data
	})

	if (!library) {
		return null
	}

	const renderContent = () => {
		return (
			<div className="flex flex-col gap-y-2">
				<Label className="text-sm">Last visited</Label>
				<EntityCard
					href={paths.libraryOverview(library.id)}
					imageUrl={getLibraryThumbnail(library.id)}
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
