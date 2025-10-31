import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronRight, Server, Slash } from 'lucide-react-native'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable, ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import RefreshControl from '~/components/RefreshControl'
import { Card, Heading, Icon, Text } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { cn } from '~/lib/utils'
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
							<Card className="squircle flex rounded-2xl border border-edge bg-background-surface">
								{savedServers.map((server, idx) => (
									<Pressable
										key={server.id}
										onPress={() =>
											router.push({
												pathname: '/(tabs)/settings/usage/[id]',
												params: { id: server.id },
											})
										}
									>
										<View
											className={cn(
												'flex flex-row items-center justify-between border-b border-b-edge p-4',
												{
													'border-b-transparent': idx === savedServers.length - 1,
												},
											)}
										>
											<Text>{server.name}</Text>

											<View className="flex flex-row items-center gap-2">
												<Text>{formatBytes(serverToUsage[server.id], 0, 'MB')}</Text>
												<Icon as={ChevronRight} className="h-5 w-5 text-foreground-muted" />
											</View>
										</View>
									</Pressable>
								))}
							</Card>
						)}

						{savedServers.length === 0 && (
							<View className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Icon as={Server} className="h-6 w-6 text-foreground-muted" />
										<Icon
											as={Slash}
											className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80"
										/>
									</View>
								</View>

								<Text>No servers added</Text>
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
