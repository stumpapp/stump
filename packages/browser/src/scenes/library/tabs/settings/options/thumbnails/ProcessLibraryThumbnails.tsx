import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, NewCard } from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useLibraryContext } from '@/components/library/context'
import { useTranslate } from '@/hooks/useTranslate'

const mutation = graphql(`
	mutation ProcessLibraryThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		processLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

export default function ProcessLibraryThumbnails() {
	const { library } = useLibraryContext()
	const { t, translate } = useTranslate()
	const { mutate } = useGraphQLMutation(mutation)

	const process = useCallback(
		(force: boolean) => mutate({ id: library.id, forceRegenerate: force }),
		[mutate, library.id],
	)

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<NewCard.Row
			label={t('thumbnailManagement.processColors.label')}
			description={t('thumbnailManagement.processColors.description')}
		>
			<DropdownMenu
				trigger={
					<Button variant="outline">
						{translate('shared.common.extract')}
						<ChevronDown className="ml-2 h-4 w-4" />
					</Button>
				}
				groups={[
					{
						items: [
							{
								label: t('thumbnailManagement.missingOnly'),
								leftIcon: <ImagePlus className={iconStyle} />,
								onClick: () => process(false),
							},
							{
								label: t('thumbnailManagement.everything'),
								variant: 'destructive',
								leftIcon: <AlertTriangle className={iconStyle} />,
								onClick: () => process(true),
							},
						],
					},
				]}
				align="start"
			/>
		</NewCard.Row>
	)
}
