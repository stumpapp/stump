import { libraryApi, libraryQueryKeys } from '@stump/api'
import { useMutation } from '@stump/client'
import { ButtonOrLink, Divider, Heading, Text } from '@stump/components'
import { Library } from '@stump/types'
import React from 'react'

import { useAppContext } from '../../../context'
import paths from '../../../paths'
import CleanLibrary from './CleanLibrary'
import DeleteLibraryThumbnails from './DeleteLibraryThumbnails'
import LibraryThumbnailSelector from './LibraryThumbnailSelector'
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

	return (
		<div>
			<Heading size="xs">Quick Actions</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				Some quick actions you can take on this library
			</Text>

			<Divider variant="muted" className="my-3.5" />
			<div className="flex items-start gap-4">
				<LibraryThumbnailSelector library={library} />
				<div className="flex flex-wrap items-center gap-2">
					{hasThumbnailConfig && (
						<>
							<RegenerateThumbnails onRegenerate={handleRegenerateThumbnails} />
							<DeleteLibraryThumbnails libraryId={library.id} />
						</>
					)}
					<CleanLibrary libraryId={library.id} />
					<ButtonOrLink href={paths.libraryFileExplorer(library.id)} size="md" variant="outline">
						Open file explorer
					</ButtonOrLink>
				</div>
			</div>
		</div>
	)
}
