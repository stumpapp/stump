import { Button, ContextMenu, Host } from '@expo/ui/swift-ui'
import { OPDSMetadata } from '@stump/sdk'
import { Ellipsis } from 'lucide-react-native'
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

	if (Platform.OS === 'android') {
		return (
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
		)
	}

	return (
		<Host matchContents>
			<ContextMenu>
				<ContextMenu.Trigger>
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
				</ContextMenu.Trigger>
				<ContextMenu.Items>
					<Button
						systemImage="trash"
						role="destructive"
						disabled={!isDownloaded || isDeleting}
						onPress={handleDeleteDownload}
					>
						Delete Download
					</Button>
				</ContextMenu.Items>
			</ContextMenu>
		</Host>
	)
}
