import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

const mutation = graphql(`
	mutation ProcessLibraryThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		processLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

export default function ProcessLibraryThumbnails() {
	const { t } = useLocaleContext()
	const { library } = useLibraryContext()

	const { mutate } = useGraphQLMutation(mutation)

	const process = useCallback(
		(force: boolean) => mutate({ id: library.id, forceRegenerate: force }),
		[mutate, library.id],
	)

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Label>{t('libraryUi.processColors')}</Label>
				<Text size="sm" variant="muted">
					{t('libraryUi.processColorsDescription')}
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button variant="outline">
							{t('libraryUi.extractColors')}
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: t('libraryUi.missingOnly'),
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => process(false),
								},
								{
									label: t('libraryUi.reprocessAll'),
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
