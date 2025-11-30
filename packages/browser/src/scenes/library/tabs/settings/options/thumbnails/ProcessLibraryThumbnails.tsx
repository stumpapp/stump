import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

const mutation = graphql(`
	mutation ProcessLibraryThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		processLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

export default function ProcessLibraryThumbnails() {
	const { library } = useLibraryContext()

	const { mutate } = useGraphQLMutation(mutation)

	const process = useCallback(
		(force: boolean) => mutate({ id: library.id, forceRegenerate: force }),
		[mutate, library.id],
	)

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Process thumbnail colors</Label>
				<Text size="sm" variant="muted">
					Extract missing thumbnail color metadata or force the regeneration of it for all
					thumbnails. This extracts the color data used for image placeholders
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button size="md" variant="outline">
							Extract colors
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: 'Missing only',
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => process(false),
								},
								{
									label: 'Reprocess all',
									leftIcon: <AlertTriangle className={iconStyle} />,
									onClick: () => process(true),
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
