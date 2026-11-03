import { OPDSMetadata } from '@stump/sdk'
import { Stack, useNavigation } from 'expo-router'
import { Trash } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

import { ActionMenu } from '~/components/ui/action-menu/action-menu'
import { useIsOPDSPublicationDownloaded, useOPDSDownload } from '~/lib/hooks'
import { useActiveServer } from '~/providers/ActiveServerProvider'

type Props = {
	publicationUrl: string
	metadata: OPDSMetadata | null | undefined
}

export default function PublicationMenu({ publicationUrl, metadata }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const isDownloaded = useIsOPDSPublicationDownloaded(publicationUrl, metadata, serverID)
	const { deleteBook, isDeleting } = useOPDSDownload({ serverId: serverID })

	const handleDeleteDownload = () => {
		deleteBook({
			publicationUrl,
			metadata,
		})
	}

	return Platform.select({
		ios: (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Menu icon="ellipsis">
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
