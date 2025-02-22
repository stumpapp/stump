import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Card, Heading, icons, Text } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'

const { ChevronRight } = icons

export default function Screen() {
	const { data } = useQuery(['app-usage'], getAppUsage, {
		suspense: true,
		cacheTime: 1000 * 60 * 5, // 5 minutes
		useErrorBoundary: false,
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

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 gap-8 bg-background px-4">
				<Heading size="lg">Data Usage</Heading>

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

					<Card className="flex rounded-xl border border-edge bg-background-surface">
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
										<ChevronRight className="h-5 w-5 text-foreground-muted" />
									</View>
								</View>
							</Pressable>
						))}
					</Card>
				</View>
			</View>
		</SafeAreaView>
	)
}
