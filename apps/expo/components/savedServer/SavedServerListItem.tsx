import { queryClient } from '@stump/client'
import { Api } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { KeyRound, Sliders, SquareX, Trash } from 'lucide-react-native'
import { View } from 'react-native'
import { match } from 'ts-pattern'

import { usePreferencesStore } from '~/stores'
import { useCacheStore } from '~/stores/cache'
import { SavedServer, useSavedServers } from '~/stores/savedServer'

import { Text } from '../ui'
import { ContextMenu } from '../ui/context-menu/context-menu'

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

	const { deleteServerToken } = useSavedServers()

	const deleteCachedSdk = useCacheStore((state) => state.removeSDK)
	const cachedServerSdk = useCacheStore((state) => state.sdks[server.id] as Api | undefined)

	const onClearCache = () => {
		// We can assume no SDK means no cache
		if (cachedServerSdk) {
			queryClient.removeQueries({
				exact: false,
				predicate: ({ queryKey }) => queryKey.includes(server.id),
			})
		}
	}

	const router = useRouter()

	const serverPath = match(server.kind)
		.with('stump', () => (forceOPDS ? '/opds/[id]' : '/server/[id]'))
		.with('opds', () => '/opds/[id]')
		.with('opds-legacy', () => '/opds-legacy/[id]')
		.exhaustive()

	return (
		<View className="w-full">
			<ContextMenu
				onPress={() =>
					router.push({
						// @ts-expect-error: It's fine
						pathname: serverPath,
						params: {
							id: server.id,
						},
					})
				}
				groups={[
					{
						items: [
							{
								label: 'Edit',
								icon: {
									ios: 'slider.horizontal.2.square.on.square',
									android: Sliders,
								},
								onPress: onEdit,
							},
							{
								label: 'Clear Cache',
								icon: {
									ios: 'clear',
									android: SquareX,
								},
								onPress: onClearCache,
								disabled: !cachedServerSdk,
							},
							...(server.kind === 'stump' && !forceOPDS
								? [
										{
											label: 'Discard Tokens',
											subtext: 'Affects login tokens only',
											icon: {
												ios: 'key.fill',
												android: KeyRound,
											},
											onPress: async () => {
												await deleteServerToken(server.id)
												const idsToDelete = [
													server.id,
													...(server.stumpOPDS ? [`${server.id}-opds`] : []),
												]
												idsToDelete.forEach((id) => deleteCachedSdk(id))
											},
										} as const,
									]
								: []),
							{
								label: 'Remove',
								icon: {
									ios: 'trash',
									android: Trash,
								},
								onPress: onDelete,
								role: 'destructive',
							},
						],
					},
				]}
			>
				<View className="bg-background-muted squircle w-full items-start rounded-2xl border border-edge bg-background-surface p-3">
					<View className="flex-1 items-start justify-center gap-1">
						<Text className="text-lg">{server.name}</Text>
						<Text className="flex-1 text-foreground-muted">{formatURL(server.url)}</Text>
					</View>
				</View>
			</ContextMenu>
		</View>
	)
}
