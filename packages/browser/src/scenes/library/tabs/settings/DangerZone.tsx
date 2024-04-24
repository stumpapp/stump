import { Heading, Text } from '@stump/components'
import React from 'react'

import { useLibraryContext } from '../../context'
import CleanLibrary from './CleanLibrary'
import DeleteLibraryThumbnails from './DeleteLibraryThumbnails'

export default function DangerZone() {
	const { library } = useLibraryContext()

	return (
		<div className="flex flex-col space-y-6">
			<div>
				<Heading size="sm">Danger zone</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					Be careful with these actions. They are irreversible.
				</Text>
			</div>

			<DeleteLibraryThumbnails libraryId={library.id} />
			<CleanLibrary libraryId={library.id} />
		</div>
	)
}
