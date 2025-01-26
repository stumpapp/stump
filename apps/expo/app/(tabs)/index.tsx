import { Link } from 'expo-router'
import partition from 'lodash/partition'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { icons, Text } from '~/components/ui'
import { usePreferencesStore, useSavedServers } from '~/stores'

const { Server, Slash, Rss } = icons

// TODO: https://www.npmjs.com/package/react-native-swipe-list-view

export default function Screen() {
	const { savedServers } = useSavedServers()
	const [stumpServers, opdsServers] = partition(savedServers, (server) => server.kind === 'stump')
	const allOPDSServers = [...stumpServers.filter((server) => !!server.stumpOPDS), ...opdsServers]

	const maskURLs = usePreferencesStore((state) => state.maskURLs)

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

	const formatURL = (url: string) => {
		try {
			const urlObj = new URL(url)
			const host = urlObj.host
			const domain = urlObj.hostname
			return maskURLs ? `${host.replace(domain, domain.replace(/./g, '*'))}` : host
		} catch {
			return maskURLs ? url.replace(/./g, '*') : url
		}
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
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
							<Link
								key={server.id}
								href={`/server/${server.id}`}
								className="bg-background-muted w-full items-center rounded-lg border border-edge bg-background-surface p-3"
							>
								<View className="flex-1 items-start justify-center gap-1">
									<Text className="text-lg">{server.name}</Text>
									<Text className="flex-1 text-foreground-muted">{formatURL(server.url)}</Text>
								</View>
							</Link>
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

						{/* TODO: indicate stump server visually with tiny favicon? */}
						{allOPDSServers.map((server) => (
							<Link
								key={server.id}
								href={`/opds/${server.id}`}
								className="bg-background-muted w-full items-center rounded-lg border border-edge bg-background-surface p-3"
							>
								<View className="flex-1 items-start justify-center gap-1">
									<Text className="text-lg">{server.name}</Text>
									<Text className="text-foreground-muted">{formatURL(server.url)}</Text>
								</View>
							</Link>
						))}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
