import { libraryApi, libraryQueryKeys } from '@stump/api'
import { useMutation } from '@stump/client'
import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import React from 'react'

import { useLibraryContext } from '@/scenes/library/context'

export default function RegenerateThumbnails() {
	const { library } = useLibraryContext()
	const { mutate } = useMutation(
		[libraryQueryKeys.regenerateThumbnails, library.id],
		(force: boolean) => libraryApi.regenerateThumbnails(library.id, force),
	)

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Regenerate thumbnails</Label>
				<Text size="sm" variant="muted">
					Either generate missing thumbnails or force the recreation of all thumbnails
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button size="md" variant="outline">
							Generate thumbnails
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: 'Create missing only',
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => mutate(false),
								},
								{
									label: 'Force recreate all',
									leftIcon: <AlertTriangle className={iconStyle} />,
									onClick: () => mutate(true),
								},
							],
						},
					]}
					align="start"
				/>
			</div>
		</div>
	)
}
