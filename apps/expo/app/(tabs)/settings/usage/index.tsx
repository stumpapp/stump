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
import { useTranslate } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { useSavedServers } from '~/stores'

export default function Screen() {
	const { t } = useTranslate()
	const { data, isLoading, isRefetching, refetch } = useQuery({
		queryKey: ['app-usage'],
		queryFn: getAppUsage,
		staleTime: 1000 * 60 * 5, // 5 minutes
		throwOnError: false,
	})

	useDynamicHeader({
		title: t(getKey('label')),
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
				<View className="gap-8 px-4 pt-8 flex-1 bg-background">
					<Card>
						<Card.StatGroup>
							<Card.Stat label={t(getKey('nonStumpData'))} value={formatBytes(data?.appTotal)} />
							<Card.Stat
								label={t(getKey('serversTotal'))}
								value={formatBytes(data?.serversTotal)}
							/>
						</Card.StatGroup>
					</Card>

					<View className="gap-4 flex-1">
						{savedServers.length > 0 && (
							<Card
								label={t('common.servers')}
								listEmptyStyle={{ icon: Server, message: 'No servers added' }}
							>
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
											<View className="gap-2 flex flex-row items-center">
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

const LOCALE_BASE = 'settings.management.dataUsage'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
