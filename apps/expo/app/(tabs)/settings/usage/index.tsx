import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronRight, Server } from 'lucide-react-native'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import RefreshControl from '~/components/RefreshControl'
import { Card, Icon, Text } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const { data, isLoading, isRefetching, refetch } = useQuery({
		queryKey: ['app-usage'],
		queryFn: getAppUsage,
		staleTime: 1000 * 60 * 5, // 5 minutes
		throwOnError: false,
	})

	useDynamicHeader({
		title: 'Data Usage',
	})

	const { savedServers } = useSavedServers()

	const serverToUsage = useMemo(
		() =>
			savedServers.reduce(
				(acc, server) => {
					acc[server.id] = data?.perServer[server.id] || 0
					return acc
				},
				{} as Record<string, number>,
			),
		[data, savedServers],
	)

	const router = useRouter()

	if (isLoading) return null

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<ScrollView
				className="flex-1 bg-background"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-1 gap-8 bg-background px-4 pt-8">
					<Card>
						<Card.StatGroup>
							<Card.Stat label="Non-Stump data" value={formatBytes(data?.appTotal)} />
							<Card.Stat label="Servers total" value={formatBytes(data?.serversTotal)} />
						</Card.StatGroup>
					</Card>

					<View className="flex-1 gap-4">
						{savedServers.length > 0 && (
							<Card label="Servers" listEmptyStyle={{ icon: Server, message: 'No servers added' }}>
								{savedServers.map((server) => (
									<Pressable
										key={server.id}
										onPress={() =>
											router.push({
												pathname: '/(tabs)/settings/usage/[id]',
												params: { id: server.id },
											})
										}
									>
										<Card.Row label={server.name}>
											<View className="flex flex-row items-center gap-2">
												<Text className="text-foreground-muted">
													{formatBytes(serverToUsage[server.id])}
												</Text>
												<Icon as={ChevronRight} className="h-5 w-5 text-foreground-muted" />
											</View>
										</Card.Row>
									</Pressable>
								))}
							</Card>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
