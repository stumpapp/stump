import { useRouter } from 'expo-router'
import partition from 'lodash/partition'
import { ExternalLink, Rss, Server } from 'lucide-react-native'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Alert, Linking, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import EmptyState from '~/components/EmptyState'
import { useOwlHeaderOffset } from '~/components/Owl'
import EditServerDialog from '~/components/savedServer/EditServerDialog'
import SavedServerListItem from '~/components/savedServer/SavedServerListItem'
import { Button, Icon, ListEmptyMessage, ListLabel, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useSavedServers } from '~/stores'
import { CreateServer, SavedServer, SavedServerWithConfig } from '~/stores/savedServer'

export default function Screen() {
	const { t } = useTranslate()
	const { savedServers, stumpEnabled, updateServer, deleteServer, getServerConfig } =
		useSavedServers()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const [stumpServers, opdsServers] = partition(savedServers, (server) => server.kind === 'stump')
	const [editingServer, setEditingServer] = useState<SavedServerWithConfig | null>(null)

	const allOPDSServers = [...stumpServers.filter((server) => server.stumpOPDS), ...opdsServers]

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
					pathname: defaultServer.kind === 'stump' ? '/server/[id]' : '/opds/[id]',
					params: { id: defaultServer.id },
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
				t('savedServerActions.deleteServer.confirmation').replace(
					'{{serverName}}',
					`'${server.name}'`,
				),
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

	const onEdit = useCallback(
		async (server: CreateServer) => {
			if (editingServer) {
				setEditingServer(null)
				await updateServer(editingServer.id, server)
			}
		},
		[setEditingServer, updateServer, editingServer],
	)

	const isCleanSlate = stumpServers.length === 0 && opdsServers.length === 0
	const emptyContainerStyle = useOwlHeaderOffset()

	return (
		<Fragment>
			<EditServerDialog
				editingServer={editingServer}
				onClose={() => setEditingServer(null)}
				onSubmit={onEdit}
			/>

			{isCleanSlate && (
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
								onPress={() => Linking.openURL('https://www.stumpapp.dev/guides/mobile/app')}
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
			)}

			{!isCleanSlate && (
				<ScrollView
					key={`${width}-${allOPDSServers.length}-${stumpServers.length}-${stumpEnabled}`}
					className="flex-1 bg-background"
					contentInsetAdjustmentBehavior="automatic"
				>
					<View className="gap-5 p-4 tablet:p-6 flex-1 items-start justify-start bg-background">
						{stumpEnabled && (
							<View className="gap-2 flex w-full items-start">
								<ListLabel className="px-2">Stump</ListLabel>

								{!stumpServers.length && (
									<ListEmptyMessage icon={Server} message={t('emptyState.noStumpServers')} />
								)}

								{stumpServers.map((server) => (
									<SavedServerListItem
										key={server.id}
										server={server}
										onEdit={() => onSelectForEdit(server)}
										onDelete={() => handleDeleteServer(server)}
									/>
								))}
							</View>
						)}

						<View className="gap-2 flex w-full items-start">
							<ListLabel className="px-2">OPDS</ListLabel>

							{!allOPDSServers.length && (
								<ListEmptyMessage icon={Rss} message={t('emptyState.noOPDSServers')} />
							)}

							{allOPDSServers.map((server) => (
								<SavedServerListItem
									key={server.id}
									server={server}
									forceOPDS
									onEdit={() => onSelectForEdit(server)}
									onDelete={() => handleDeleteServer(server)}
								/>
							))}
						</View>
					</View>
				</ScrollView>
			)}
		</Fragment>
	)
}
