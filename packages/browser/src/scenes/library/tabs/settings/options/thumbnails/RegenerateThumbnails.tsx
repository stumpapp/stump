import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

const mutation = graphql(`
	mutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		generateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

export default function RegenerateThumbnails() {
	const { library } = useLibraryContext()

	const { mutate } = useGraphQLMutation(mutation)

	const regenerate = useCallback(
		(force: boolean) => mutate({ id: library.id, forceRegenerate: force }),
		[mutate, library.id],
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
									onClick: () => regenerate(false),
								},
								{
									label: 'Force recreate all',
									leftIcon: <AlertTriangle className={iconStyle} />,
									onClick: () => regenerate(true),
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
