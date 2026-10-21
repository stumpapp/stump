import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, NewCard } from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContext } from '@/scenes/library/context'

// TODO: leaving lints to remember to localize

const mutation = graphql(`
	mutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		generateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

export default function RegenerateThumbnails() {
	const { library } = useLibraryContext()
	const { t } = useTranslate()
	const { mutate } = useGraphQLMutation(mutation)

	const regenerate = useCallback(
		(force: boolean) => mutate({ id: library.id, forceRegenerate: force }),
		[mutate, library.id],
	)

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<NewCard.Row
			label={t('thumbnailManagement.regenerateThumbnails.label')}
			description={t('thumbnailManagement.regenerateThumbnails.description')}
		>
			<div>
				<DropdownMenu
					trigger={
						<Button variant="outline">
							{t('thumbnailManagement.generate')}
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: t('thumbnailManagement.missingOnly'),
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => regenerate(false),
								},
								{
									label: t('thumbnailManagement.everything'),
									isDestructive: true,
									leftIcon: <AlertTriangle className={iconStyle} />,
									onClick: () => regenerate(true),
								},
							],
						},
					]}
					align="start"
				/>
			</div>
		</NewCard.Row>
	)
}
