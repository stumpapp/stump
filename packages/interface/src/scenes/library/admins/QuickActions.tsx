import { libraryApi, libraryQueryKeys } from '@stump/api'
import { useMutation } from '@stump/client'
import { Divider, Heading, Text } from '@stump/components'
import { Library } from '@stump/types'
import React from 'react'

import { useAppContext } from '../../../context'
import DeleteLibraryThumbnailsSection from './DeleteLibraryThumbnailsSection'
import RegenerateThumbnails from './RegenerateThumbnails'

type Props = {
	library: Library
}
export default function QuickActions({ library }: Props) {
	const { isServerOwner } = useAppContext()
	const { mutate } = useMutation(
		[libraryQueryKeys.regenerateThumbnails, library.id],
		(force: boolean) => libraryApi.regenerateThumbnails(library.id, force),
	)

	const hasThumbnailConfig = !!library.library_options.thumbnail_config

	const handleRegenerateThumbnails = (force: boolean) => {
		if (!hasThumbnailConfig || !isServerOwner) {
			return
		}
		mutate(force)
	}

	// TODO: looks awful and scuffed!
	return (
		<div>
			<Heading size="xs">Quick Actions</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				Some quick actions you can take on this library
			</Text>

			<Divider variant="muted" className="my-3.5" />
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<DeleteLibraryThumbnailsSection libraryId={library.id} />
				{hasThumbnailConfig && <RegenerateThumbnails onRegenerate={handleRegenerateThumbnails} />}
			</div>
		</div>
	)
}
