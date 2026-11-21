import { OPDSMetadata } from '@stump/sdk'
import { Stack, useNavigation, useRouter } from 'expo-router'
import { EyeOff, Trash } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

import { usePublicationContext } from '~/app/opds/[serverId]/publication/context'
import { ActionMenu } from '~/components/ui/action-menu/action-menu'
import { useIsOPDSPublicationDownloaded, useOPDSDownload, useTranslate } from '~/lib/hooks'
import { useActiveServer } from '~/providers/ActiveServerProvider'
import { useReaderStore } from '~/stores'

import { ActionMenuItem } from '../ui/action-menu/types'

type Props = {
	publicationUrl: string
	metadata: OPDSMetadata | null | undefined
}

export default function PublicationMenu({ publicationUrl, metadata }: Props) {
	const {
		activeServer: { id: serverId },
	} = useActiveServer()
	const { translate } = useTranslate()
	const { deleteBook, isDeleting } = useOPDSDownload({ serverId })
	const {
		publication: { readingOrder },
	} = usePublicationContext()

	const isDownloaded = useIsOPDSPublicationDownloaded(publicationUrl, metadata)
	const disableProgressTracking = useReaderStore((store) => store.setDisableProgressTracking)
	const canStream = !!readingOrder && readingOrder.length > 0
	const isSupportedStream = readingOrder?.every((link) => link.type?.startsWith('image/'))

	const handleDeleteDownload = () => {
		deleteBook({
			publicationUrl,
			metadata,
		})
	}

	const router = useRouter()

	return Platform.select({
		ios: (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Menu icon="ellipsis">
					{!disableProgressTracking && (
						<Stack.Toolbar.MenuAction
							icon="eye.slash"
							onPress={() =>
								router.push({
									pathname: `/opds/[serverId]/publication/read`,
									params: { url: publicationUrl, serverId, incognito: 'true' },
								})
							}
							disabled={!canStream || !isSupportedStream}
						>
							{translate('shared.bookActions.readIncognito')}
						</Stack.Toolbar.MenuAction>
					)}

					<Stack.Toolbar.MenuAction
						icon="trash"
						onPress={handleDeleteDownload}
						destructive
						disabled={!isDownloaded || isDeleting}
					>
						Delete Download
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar>
		),
		android: (
			<ActionMenu
				groups={[
					...(!disableProgressTracking
						? [
								{
									items: [
										{
											label: translate('shared.bookActions.readIncognito'),
											icon: { ios: 'eye.slash', android: EyeOff },
											onPress: () => {
												router.push({
													pathname: `/opds/[serverId]/publication/read`,
													params: { url: publicationUrl, serverId, incognito: 'true' },
												})
											},
											disabled: !canStream || !isSupportedStream,
										} satisfies ActionMenuItem,
									],
								},
							]
						: []),
					{
						items: [
							{
								label: 'Delete Download',
								icon: { ios: 'trash', android: Trash },
								onPress: handleDeleteDownload,
								role: 'destructive',
								disabled: isDeleting,
							},
						],
					},
				]}
			/>
		),
	})
}

export function usePublicationMenu(props: Props) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => <PublicationMenu {...props} />,
			})
		}
	}, [navigation, props])

	if (Platform.OS === 'ios') {
		return <PublicationMenu {...props} />
	}

	return null
}
