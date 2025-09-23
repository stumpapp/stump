import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import * as ContextMenu from 'zeego/context-menu'

import { usePreferencesStore } from '~/stores'
import { SavedServer } from '~/stores/savedServer'

import { Text } from '../ui'

type Props = {
	server: SavedServer
	onEdit: () => void
	onDelete: () => void
	forceOPDS?: boolean
}

export default function SavedServerListItem({ server, onEdit, onDelete, forceOPDS }: Props) {
	const maskURLs = usePreferencesStore((state) => state.maskURLs)

	const formatURL = (url: string) => {
		try {
			const urlObj = new URL(url)
			const host = urlObj.host
			const domain = urlObj.hostname

			return maskURLs
				? `${urlObj.protocol}//${host.replace(domain, domain.replace(/./g, '*'))}`
				: `${urlObj.protocol}//${host}`
		} catch {
			return maskURLs ? url.replace(/./g, '*') : url
		}
	}

	const router = useRouter()

	return (
		<View className="w-full">
			<ContextMenu.Root>
				<ContextMenu.Trigger className="w-full">
					<Pressable
						key={server.id}
						onPress={() =>
							router.push({
								pathname: server.kind === 'stump' && !forceOPDS ? '/server/[id]' : '/opds/[id]',
								params: {
									id: server.id,
								},
							})
						}
					>
						<View className="bg-background-muted squircle w-full items-start rounded-2xl border border-edge bg-background-surface p-3">
							<View className="flex-1 items-start justify-center gap-1">
								<Text className="text-lg">{server.name}</Text>
								<Text className="flex-1 text-foreground-muted">{formatURL(server.url)}</Text>
							</View>
						</View>
					</Pressable>
				</ContextMenu.Trigger>

				<ContextMenu.Content>
					<ContextMenu.Item key="edit" onSelect={onEdit}>
						<ContextMenu.ItemTitle>Edit</ContextMenu.ItemTitle>

						<ContextMenu.ItemIcon
							ios={{
								name: 'slider.horizontal.2.square.on.square',
							}}
						/>
					</ContextMenu.Item>
					<ContextMenu.Item key="remove" destructive onSelect={onDelete}>
						<ContextMenu.ItemTitle>Remove</ContextMenu.ItemTitle>

						<ContextMenu.ItemIcon
							ios={{
								name: 'trash',
							}}
						/>
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</View>
	)
}
