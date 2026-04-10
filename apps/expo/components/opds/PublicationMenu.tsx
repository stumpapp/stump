import { OPDSMetadata } from '@stump/sdk'
import { Stack, useNavigation } from 'expo-router'
import { Ellipsis } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { useIsOPDSPublicationDownloaded, useOPDSDownload } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { Icon } from '../ui'

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
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Pressable>
						<View
							accessibilityLabel="options"
							style={{
								height: 35,
								width: 35,
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Icon as={Ellipsis} size={24} className="text-foreground" />
						</View>
					</Pressable>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content>
					<DropdownMenu.Item
						key="delete-download"
						onSelect={handleDeleteDownload}
						disabled={isDeleting}
						destructive
					>
						<DropdownMenu.ItemTitle>Delete Download</DropdownMenu.ItemTitle>
						<DropdownMenu.ItemIcon ios={{ name: 'trash' }} />
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
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
