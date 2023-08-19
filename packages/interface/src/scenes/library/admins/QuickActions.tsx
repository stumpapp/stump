import { Divider, Heading, Text } from '@stump/components'
import React from 'react'
import { useParams } from 'react-router'

import DeleteLibraryThumbnailsSection from './DeleteLibraryThumbnailsSection'

export default function QuickActions() {
	const { id } = useParams()

	if (!id) {
		return null
	}

	return (
		<div>
			<Heading size="xs">Quick Actions</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				Some quick actions you can take on this library
			</Text>

			<Divider variant="muted" className="my-3.5" />
			<DeleteLibraryThumbnailsSection libraryId={id} />
		</div>
	)
}
