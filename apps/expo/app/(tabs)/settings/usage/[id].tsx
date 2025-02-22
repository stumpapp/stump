import { useQuery } from '@tanstack/react-query'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import RefreshControl from '~/components/RefreshControl'
import { Button, Heading, Text } from '~/components/ui'
import { icons } from '~/lib'
import { getServerStoredPreferencesUsage } from '~/lib/filesystem'
import { formatBytesSeparate, humanizeByteUnit } from '~/lib/format'
import { useReaderStore } from '~/stores'
import { useServerDownloads } from '~/stores/download'
import { useSavedServerStore } from '~/stores/savedServer'

const { Slash, HardDriveDownload } = icons

export default function Screen() {
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const {
		data: preferencesBytes,
		refetch,
		isRefetching,
	} = useQuery({
		queryKey: ['server-pref-usage', serverID],
		queryFn: () => getServerStoredPreferencesUsage(serverID),
		suspense: true,
	})

	const server = useSavedServerStore((state) =>
		state.servers.find((server) => server.id === serverID),
	)
	const downloadedFiles = useServerDownloads({ id: serverID })
	const preferences = formatBytesSeparate(preferencesBytes, 1, 'B')

	const clearLibrarySettings = useReaderStore((state) => state.clearLibrarySettings)
	const onClearPreferences = useCallback(() => {
		clearLibrarySettings(serverID)
		refetch()
	}, [serverID, clearLibrarySettings, refetch])

	if (!server) {
		return <Redirect href="/settings/usage" />
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView
				className="flex-1 bg-background"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			>
				<View className="flex-1 gap-8 bg-background px-4">
					<Heading size="lg">{server?.name || 'Server'}</Heading>

					<View className="flex-1 gap-4">
						<Heading>Downloads</Heading>

						{!downloadedFiles.length && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<HardDriveDownload className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No downloaded files for this server</Text>
							</View>
						)}
					</View>

					<View className="flex-1 gap-4">
						<View>
							<Heading>Stored preferences</Heading>
							<Text className="text-foreground-muted">
								Miscellaneous data like book preferences, offline reading progress, etc.
							</Text>
						</View>

						<View className="flex-row">
							<View className="flex items-center justify-center">
								<Heading className="font-medium">{preferences?.value || 0}</Heading>
								<Text size="sm" className="shrink-0 text-foreground-muted">
									{humanizeByteUnit(preferences?.value || 0, preferences?.unit || 'B')}
								</Text>
							</View>
						</View>

						<Button
							variant="destructive"
							onPress={onClearPreferences}
							size="md"
							disabled={!preferencesBytes}
						>
							<Text>Clear preferences</Text>
						</Button>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
