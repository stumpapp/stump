import { Link } from 'expo-router'
import { View } from 'react-native'

import { usePreferencesStore } from '~/stores'
import { SavedServer } from '~/stores/savedServer'

import { Text } from '../ui'

type Props = {
	server: SavedServer
	forceOPDS?: boolean
}

// TODO: context menu
export default function SavedServerListItem({ server, forceOPDS }: Props) {
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

	return (
		<Link
			key={server.id}
			href={server.kind === 'stump' && !forceOPDS ? `/server/${server.id}` : `/opds/${server.id}`}
			className="bg-background-muted w-full items-center rounded-lg border border-edge bg-background-surface p-3"
		>
			<View className="flex-1 items-start justify-center gap-1">
				<Text className="text-lg">{server.name}</Text>
				<Text className="flex-1 text-foreground-muted">{formatURL(server.url)}</Text>
			</View>
		</Link>
	)
}
