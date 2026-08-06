import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

const mutation = graphql(`
	mutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		generateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

export default function RegenerateThumbnails() {
	const { t } = useLocaleContext()
	const { library } = useLibraryContext()

	const { mutate } = useGraphQLMutation(mutation)

	const regenerate = useCallback(
		(force: boolean) => mutate({ id: library.id, forceRegenerate: force }),
		[mutate, library.id],
	)

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Label>{t('libraryUi.regenerate')}</Label>
				<Text size="sm" variant="muted">
					{t('libraryUi.regenerateDescription')}
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button variant="outline">
							{t('libraryUi.generate')}
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: t('libraryUi.createMissing'),
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => regenerate(false),
								},
								{
									label: t('libraryUi.forceRecreate'),
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
		</div>
	)
}
