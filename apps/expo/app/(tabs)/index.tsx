import partition from 'lodash/partition'
import { useState } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import DeleteServerConfirmation from '~/components/savedServer/DeleteServerConfirmation'

import SavedServerListItem from '~/components/savedServer/SavedServerListItem'
import { icons, Text } from '~/components/ui'
import { useSavedServers } from '~/stores'
import { SavedServer } from '~/stores/savedServer'

const { Server, Slash, Rss } = icons

export default function Screen() {
	const { savedServers } = useSavedServers()

	const [stumpServers, opdsServers] = partition(savedServers, (server) => server.kind === 'stump')
	const [editingServer, setEditingServer] = useState<SavedServer | null>(null)
	const [deletingServer, setDeletingServer] = useState<SavedServer | null>(null)

	const allOPDSServers = [...stumpServers.filter((server) => !!server.stumpOPDS), ...opdsServers]

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

	return (
		<SafeAreaView className="flex-1 bg-background">
			<DeleteServerConfirmation
				isOpen={!!deletingServer}
				onClose={() => setDeletingServer(null)}
				onConfirm={() => {
					console.log('delete server')
				}}
			/>

			<ScrollView>
				<View className="flex-1 items-start justify-start gap-5 bg-background px-6">
					<View className="flex w-full items-start gap-2">
						<Text className="text-foreground-muted">Stump</Text>

						{!stumpServers.length && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Server className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No Stump servers added</Text>
							</View>
						)}

						{stumpServers.map((server) => (
							<SavedServerListItem
								key={server.id}
								server={server}
								onEdit={() => setEditingServer(server)}
								onDelete={() => setDeletingServer(server)}
							/>
						))}
					</View>

					<View className="flex w-full items-start gap-2">
						<Text className="text-foreground-muted">OPDS</Text>

						{!allOPDSServers.length && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Rss className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No OPDS feeds added</Text>
							</View>
						)}

						{allOPDSServers.map((server) => (
							<SavedServerListItem
								key={server.id}
								server={server}
								forceOPDS
								onEdit={() => setEditingServer(server)}
								onDelete={() => setDeletingServer(server)}
							/>
						))}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
