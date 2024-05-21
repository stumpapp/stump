import { libraryApi, libraryQueryKeys } from '@stump/api'
import { useMutation } from '@stump/client'
import { Button, Heading, Text } from '@stump/components'
import React from 'react'

import { useLibraryContext } from '../../context'
import LibraryThumbnailSelector from './LibraryThumbnailSelector'
import RegenerateThumbnails from './RegenerateThumbnails'

// TODO: this is ugly....
export default function QuickActions() {
	const { library } = useLibraryContext()
	const { mutate } = useMutation(
		[libraryQueryKeys.regenerateThumbnails, library.id],
		(force: boolean) => libraryApi.regenerateThumbnails(library.id, force),
	)

	const hasThumbnailConfig = !!library.library_options.thumbnail_config

	function handleAnalyze() {
		libraryApi.startMediaAnalysis(library.id)
	}

	const handleRegenerateThumbnails = (force: boolean) => {
		if (!hasThumbnailConfig) {
			return
		}
		mutate(force)
	}

	return (
		<div className="flex flex-col space-y-6">
			<div>
				<Heading size="sm">Quick actions</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					Some quick actions you can take on this library
				</Text>
			</div>

			<LibraryThumbnailSelector />
			<RegenerateThumbnails onRegenerate={handleRegenerateThumbnails} />
			<div>
				<Button size="md" variant="primary" onClick={handleAnalyze}>
					Analyze Media
				</Button>
			</div>
		</div>
	)
}
