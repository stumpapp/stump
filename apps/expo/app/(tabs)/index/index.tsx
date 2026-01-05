import { useRouter } from 'expo-router'
import partition from 'lodash/partition'
import { ExternalLink, Rss, Server } from 'lucide-react-native'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Linking, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import EmptyState from '~/components/EmptyState'
import { useOwlHeaderOffset } from '~/components/Owl'
import DeleteServerConfirmation from '~/components/savedServer/DeleteServerConfirmation'
import EditServerDialog from '~/components/savedServer/EditServerDialog'
import SavedServerListItem from '~/components/savedServer/SavedServerListItem'
import { Button, Icon, ListEmptyMessage, Text } from '~/components/ui'
import { useSavedServers } from '~/stores'
import { CreateServer, SavedServer, SavedServerWithConfig } from '~/stores/savedServer'

export default function Screen() {
	const { savedServers, stumpEnabled, updateServer, deleteServer, getServerConfig } =
		useSavedServers()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const [stumpServers, opdsServers] = partition(savedServers, (server) => server.kind === 'stump')
	const [editingServer, setEditingServer] = useState<SavedServerWithConfig | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)

	const allOPDSServers = [...stumpServers.filter((server) => server.stumpOPDS), ...opdsServers]
	const defaultServer = allOPDSServers.find((server) => server.defaultServer)

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

	const onConfirmDelete = useCallback(() => {
		if (deletingServer) {
			deleteServer(deletingServer.id)
			setDeletingServer(null)
		}
	}, [deletingServer, deleteServer])

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
			<DeleteServerConfirmation
				deletingServer={deletingServer}
				onClose={() => setDeletingServer(null)}
				onConfirm={onConfirmDelete}
			/>

			<EditServerDialog
				editingServer={editingServer}
				onClose={() => setEditingServer(null)}
				onSubmit={onEdit}
			/>

			{isCleanSlate && (
				<EmptyState
					title="Nothing to show yet"
					message="Get started by adding a server to access book collections"
					actions={
						<>
							<Button
								variant="brand"
								size="lg"
								roundness="full"
								className="relative"
								onPress={() => Linking.openURL('https://www.stumpapp.dev/guides/mobile/app')}
							>
								<Text>See Documentation</Text>

								<Icon
									as={ExternalLink}
									size={16}
									className="absolute right-4 transform text-foreground"
								/>
							</Button>
						</>
					}
					containerStyle={emptyContainerStyle}
				/>
			)}

			{!isCleanSlate && (
				<ScrollView
					key={`${width}-${allOPDSServers.length}-${stumpServers.length}`}
					className="flex-1 bg-background"
					contentInsetAdjustmentBehavior="automatic"
				>
					<View className="flex-1 items-start justify-start gap-5 bg-background p-6">
						{stumpEnabled && (
							<View className="flex w-full items-start gap-2">
								<Text className="text-foreground-muted">Stump</Text>

								{!stumpServers.length && (
									<ListEmptyMessage icon={Server} message="No Stump servers added" />
								)}

								{stumpServers.map((server) => (
									<SavedServerListItem
										key={server.id}
										server={server}
										onEdit={() => onSelectForEdit(server)}
										onDelete={() => setDeletingServer(server)}
									/>
								))}
							</View>
						)}

						<View className="flex w-full items-start gap-2">
							<Text className="text-foreground-muted">OPDS</Text>

							{!allOPDSServers.length && (
								<ListEmptyMessage icon={Rss} message="No OPDS feeds added" />
							)}

							{allOPDSServers.map((server) => (
								<SavedServerListItem
									key={server.id}
									server={server}
									forceOPDS
									onEdit={() => onSelectForEdit(server)}
									onDelete={() => setDeletingServer(server)}
								/>
							))}
						</View>
					</View>
				</ScrollView>
			)}
		</Fragment>
	)
}
