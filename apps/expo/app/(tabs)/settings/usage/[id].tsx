import { useQuery } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { HardDriveDownload } from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { Alert, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import RefreshControl from '~/components/RefreshControl'
import { Button, Card, Text } from '~/components/ui'
import { db, downloadedFiles } from '~/db'
import { getServerStoredPreferencesUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { useDownload } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { useReaderStore } from '~/stores'
import { useSavedServerStore } from '~/stores/savedServer'

export default function Screen() {
	const { id: serverID } = useLocalSearchParams<{ id: string }>()

	const {
		data: preferencesBytes,
		refetch,
		isRefetching,
		isLoading,
	} = useQuery({
		queryKey: ['server-pref-usage', serverID],
		queryFn: () => getServerStoredPreferencesUsage(serverID),
		throwOnError: false,
	})

	const server = useSavedServerStore((state) =>
		state.servers.find((server) => server.id === serverID),
	)
	const { data: files } = useLiveQuery(
		db.select().from(downloadedFiles).where(eq(downloadedFiles.serverId, serverID)),
	)
	const preferencesSize = formatBytes(preferencesBytes)

	const downloadedFilesSum = useMemo(
		() => files.reduce((acc, file) => acc + (file.size || 0), 0),
		[files],
	)
	const humanizedUsage = useMemo(() => formatBytes(downloadedFilesSum), [downloadedFilesSum])
	const downloadedFilesCount = useMemo(() => files.length, [files])

	const clearLibrarySettings = useReaderStore((state) => state.clearLibrarySettings)
	const onClearPreferences = useCallback(() => {
		clearLibrarySettings(serverID)
		refetch()
	}, [serverID, clearLibrarySettings, refetch])

	const { deleteServerDownloads } = useDownload()
	const onDeleteDownloads = useCallback(async () => {
		try {
			await deleteServerDownloads(serverID)
			refetch()
		} catch {
			Alert.alert(
				'Deletion Failed',
				`There was an error deleting all all downloads from "${server?.name || 'this server'}".`,
			)
		}
	}, [deleteServerDownloads, serverID, refetch, server?.name])

	useDynamicHeader({
		title: server?.name || '',
	})

	const handleDelete = useCallback(() => {
		Alert.alert(
			'Delete Downloads',
			`Are you sure you want to delete all downloads from ${server?.name ? `'${server?.name}'` : 'this server'}?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Delete', style: 'destructive', onPress: onDeleteDownloads },
			],
		)
	}, [onDeleteDownloads, server?.name])

	if (!server) {
		return <Redirect href="/settings/usage" />
	}

	if (isLoading) return null

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<ScrollView
				className="flex-1 bg-background"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-1 gap-8 bg-background px-4 pt-8">
					<View className="flex-1 gap-4">
						<Card
							label="Downloads"
							listEmptyStyle={{
								icon: HardDriveDownload,
								message: 'No downloaded files for this server',
							}}
						>
							<Card.StatGroup>
								<Card.Stat label="Total files" value={downloadedFilesCount} />
								{humanizedUsage && <Card.Stat label="Total size" value={humanizedUsage} />}
							</Card.StatGroup>
							{(files.length > 0 || downloadedFilesSum > 0) && (
								<Card.Row label="Delete Downloads">
									<Button size="sm" roundness="full" variant="destructive" onPress={handleDelete}>
										<Text>Delete</Text>
									</Button>
								</Card.Row>
							)}
						</Card>
					</View>

					<View className="flex-1 gap-4">
						<Card
							label="Stored Preferences"
							description="Miscellaneous data like book preferences, offline reading progress, etc."
						>
							<Card.StatGroup>
								<Card.Stat label="Total size" value={preferencesSize} />
							</Card.StatGroup>
							{!!preferencesBytes && (
								<Card.Row label="Clear Preferences">
									<Button
										size="sm"
										roundness="full"
										variant="destructive"
										onPress={onClearPreferences}
									>
										<Text>Clear</Text>
									</Button>
								</Card.Row>
							)}
						</Card>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
