import { Link } from 'expo-router'
import { View } from 'react-native'
import * as ContextMenu from 'zeego/context-menu'

import { usePreferencesStore } from '~/stores'
import { SavedServer } from '~/stores/savedServer'

import { Text } from '../ui'
import { cn } from '~/lib/utils'
import { useState } from 'react'

type Props = {
	server: SavedServer
	onEdit: () => void
	onDelete: () => void
	forceOPDS?: boolean
}

export default function SavedServerListItem({ server, onEdit, onDelete, forceOPDS }: Props) {
	const maskURLs = usePreferencesStore((state) => state.maskURLs)
	const [isOpen, setIsOpen] = useState(false)

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

	return (
		<View className="w-full rounded-2xl">
			<ContextMenu.Root onOpenChange={setIsOpen}>
				<ContextMenu.Trigger className="w-full">
					<Link
						key={server.id}
						href={
							server.kind === 'stump' && !forceOPDS ? `/server/${server.id}` : `/opds/${server.id}`
						}
						className="bg-background-muted w-full items-center rounded-2xl border border-edge bg-background-surface p-3"
					>
						<View className="flex-1 items-start justify-center gap-1">
							<Text className="text-lg">{server.name}</Text>
							<Text className="flex-1 text-foreground-muted">{formatURL(server.url)}</Text>
						</View>
					</Link>
				</ContextMenu.Trigger>

				<ContextMenu.Content>
					<ContextMenu.Item key="edit" onSelect={onEdit}>
						Edit
					</ContextMenu.Item>
					<ContextMenu.Item key="remove" destructive onSelect={onDelete}>
						Remove
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</View>
	)
}
