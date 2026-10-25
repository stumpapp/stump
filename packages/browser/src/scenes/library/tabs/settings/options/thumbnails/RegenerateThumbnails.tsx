import { useGraphQLMutation } from '@stump/client'
import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContext } from '@/scenes/library/context'

const mutation = graphql(`
	mutation RegenerateThumbnails($id: ID!, $forceRegenerate: Boolean!) {
		generateLibraryThumbnails(id: $id, forceRegenerate: $forceRegenerate)
	}
`)

const LOCALE_KEY =
	'librarySettingsScene.options/thumbnails.sections.management.regenerateThumbnails'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

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
		<div className="gap-4 flex flex-col">
			<div>
				<Label>{t(getKey('heading'))}</Label>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button variant="outline">
							{t(getKey('trigger'))}
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: t(getKey('missingOnly')),
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => regenerate(false),
								},
								{
									label: t(getKey('forceRecreateAll')),
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
