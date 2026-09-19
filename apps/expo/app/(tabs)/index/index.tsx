import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { ExternalLink } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, useWindowDimensions, View } from 'react-native'

import EmptyState from '~/components/EmptyState'
import { useGridItemSize } from '~/components/listLayout/grid/useGridItemSize'
import { useOwlHeaderOffset } from '~/components/Owl'
import { UpdateServerSheet } from '~/components/savedServer/createOrUpdate/UpdateServerSheet'
import SavedServerListItem from '~/components/savedServer/SavedServerListItem'
import { Button, Icon, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useSavedServers } from '~/stores'
import { SavedServer, SavedServerWithConfig } from '~/stores/savedServer'

export default function Screen() {
	const { t } = useTranslate()
	const { savedServers, deleteServer, getServerConfig } = useSavedServers()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const [editingServer, setEditingServer] = useState<SavedServerWithConfig | null>(null)

	const defaultServer = savedServers.find((server) => server.defaultServer)

	const [didMount, setDidMount] = useState(false)
	useEffect(() => {
		if (!didMount) {
			setDidMount(true)
		}
	}, [didMount])

	useEffect(
		() => {
			if (!didMount) return

			if (defaultServer) {
				router.push({
					// @ts-expect-error: string path
					pathname: defaultServer.kind === 'stump' ? '/stump/[serverId]' : '/opds/[serverId]',
					params: { serverId: defaultServer.id },
				})
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[router, didMount],
	)

	// const serverStatuses = useQueries({
	// 	queries: stumpServers.map((server) => ({
	// 		queryFn: async () =>
	// 			({
	// 				name: server.name,
	// 				status: await checkUrl(formatApiURL(server.url, 'v1')),
	// 			}) as PingResult,
	// 		queryKey: ['ping', server.url, server.name],
	// 		refetchInterval: (result?: PingResult) => {
	// 			if (!result) return false
	// 			return result.status ? PING_HEALTHY_INTERVAL_MS : PING_UNHEALTHY_INTERVAL_MS
	// 		},
	// 	})),
	// })

	const handleDeleteServer = useCallback(
		(server: SavedServer) => {
			Alert.alert(
				t('savedServerActions.deleteServer.title'),
				t('savedServerActions.deleteServer.confirmation', {
					serverName: `'${server.name}'`,
				}),
				[
					{ text: t('common.cancel'), style: 'cancel' },
					{
						text: t('common.delete'),
						style: 'destructive',
						onPress: () => deleteServer(server.id),
					},
				],
			)
		},
		[deleteServer, t],
	)

	const onSelectForEdit = useCallback(
		async (server: SavedServer) => {
			const config = await getServerConfig(server.id)
			setEditingServer({ ...server, config })
		},
		[getServerConfig],
	)

	const isCleanSlate = savedServers.length === 0
	const emptyContainerStyle = useOwlHeaderOffset()

	const { numColumns, paddingHorizontal } = useGridItemSize()

	if (isCleanSlate) {
		return (
			<ScrollView
				key={`${width}-${savedServers.length}`}
				className="flex-1 bg-background"
				contentInsetAdjustmentBehavior="automatic"
			>
				<EmptyState
					title={t('emptyState.noServers')}
					message={t('emptyState.cta')}
					actions={
						<>
							<Button
								variant="brand"
								size="lg"
								roundness="full"
								className="relative"
								onPress={() => Linking.openURL('https://www.stumpapp.dev/docs/apps/mobile')}
							>
								<Text>{t('emptyState.seeDocumentation')}</Text>

								<Icon
									as={ExternalLink}
									size={16}
									className="right-4 absolute transform text-foreground"
								/>
							</Button>
						</>
					}
					containerStyle={emptyContainerStyle}
				/>
			</ScrollView>
		)
	}

	// TODO: refresh could re-pull avatars?
	return (
		<FlashList
			data={savedServers}
			renderItem={({ item: server }) => (
				<SavedServerListItem
					key={server.id}
					server={server}
					onEdit={() => onSelectForEdit(server)}
					onDelete={() => handleDeleteServer(server)}
				/>
			)}
			contentInsetAdjustmentBehavior="automatic"
			numColumns={numColumns}
			contentContainerStyle={{
				paddingVertical: 16,
				paddingHorizontal,
			}}
			ItemSeparatorComponent={() => <View className="h-4" />}
			// TODO: it would probably be nice to add filters/sorting etc, would need to restructure
			// layout to use toolbar api etc etc
			ListHeaderComponent={
				<>
					<UpdateServerSheet editingServer={editingServer} onClose={() => setEditingServer(null)} />
				</>
			}
		/>
	)
}
