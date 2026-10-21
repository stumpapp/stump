import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, Label, NewCard, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContext } from '@/scenes/library/context'

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
								isDestructive: true,
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

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Label>Process thumbnail colors</Label>
				<Text size="sm" variant="muted">
					Extract missing thumbnail color metadata or force the regeneration of it for all
					thumbnails
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button variant="outline">
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
									isDestructive: true,
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
