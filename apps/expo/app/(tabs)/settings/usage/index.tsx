import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronRight, Server } from 'lucide-react-native'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import RefreshControl from '~/components/RefreshControl'
import { CardList, Heading, Icon, ListEmptyMessage, Text } from '~/components/ui'
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
					<View className="flex-row justify-around">
						<View className="flex items-center justify-center">
							<Heading className="font-medium">{formatBytes(data?.appTotal || 0, 0, 'MB')}</Heading>
							<Text size="sm" className="shrink-0 text-foreground-muted">
								Non-Stump data
							</Text>
						</View>

						<View className="flex items-center justify-center">
							<Heading className="font-medium">
								{formatBytes(data?.serversTotal || 0, 0, 'MB')}
							</Heading>
							<Text size="sm" className="shrink-0 text-foreground-muted">
								Servers total
							</Text>
						</View>
					</View>

					<View className="flex-1 gap-4">
						<Heading>Servers</Heading>

						{savedServers.length > 0 && (
							<CardList>
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
										<View className={'flex flex-row items-center justify-between p-4'}>
											<Text>{server.name}</Text>

											<View className="flex flex-row items-center gap-2">
												<Text>{formatBytes(serverToUsage[server.id], 0, 'MB')}</Text>
												<Icon as={ChevronRight} className="h-5 w-5 text-foreground-muted" />
											</View>
										</View>
									</Pressable>
								))}
							</CardList>
						)}

						{savedServers.length === 0 && (
							<ListEmptyMessage icon={Server} message="No servers added" />
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
