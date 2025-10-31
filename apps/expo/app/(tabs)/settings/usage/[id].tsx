import { useQuery } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { HardDriveDownload, Slash } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'
import Dialog from 'react-native-dialog'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import RefreshControl from '~/components/RefreshControl'
import { Button, Heading, Icon, Text } from '~/components/ui'
import { db, downloadedFiles } from '~/db'
import { getServerStoredPreferencesUsage } from '~/lib/filesystem'
import { formatBytesSeparate, humanizeByteUnit } from '~/lib/format'
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
	const preferences = formatBytesSeparate(preferencesBytes, 1, 'B')

	const downloadedFilesSum = useMemo(
		() => files.reduce((acc, file) => acc + (file.size || 0), 0),
		[files],
	)
	const humanizedUsage = useMemo(
		() => formatBytesSeparate(downloadedFilesSum),
		[downloadedFilesSum],
	)
	const downloadedFilesCount = useMemo(() => files.length, [files])

	const clearLibrarySettings = useReaderStore((state) => state.clearLibrarySettings)
	const onClearPreferences = useCallback(() => {
		clearLibrarySettings(serverID)
		refetch()
	}, [serverID, clearLibrarySettings, refetch])

	const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false)

	const { deleteServerDownloads } = useDownload()
	const onDeleteDownloads = useCallback(async () => {
		try {
			await deleteServerDownloads(serverID)
			refetch()
		} finally {
			setIsShowingDeleteConfirm(false)
		}
	}, [deleteServerDownloads, serverID, refetch])

	useDynamicHeader({
		title: server?.name || '',
	})

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
						<Heading>Downloads</Heading>

						{!files.length && (
							<View className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Icon as={HardDriveDownload} className="h-6 w-6 text-foreground-muted" />
										<Icon
											as={Slash}
											className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80"
										/>
									</View>
								</View>

								<Text>No downloaded files for this server</Text>
							</View>
						)}

						{(files.length > 0 || downloadedFilesSum > 0) && (
							<View className="gap-4">
								<View className="flex-row items-center justify-between">
									<Text className="text-foreground-muted">Total files</Text>
									<Text>{downloadedFilesCount}</Text>
								</View>

								<View className="flex-row items-center justify-between">
									<Text className="text-foreground-muted">Total size</Text>
									{humanizedUsage && (
										<Text>
											{humanizedUsage.value} {humanizedUsage.unit}
										</Text>
									)}
									{/* TODO: Infer from usage */}
									{downloadedFilesSum === 0 && <Text>Unknown</Text>}
								</View>

								<Button
									variant="destructive"
									onPress={() => setIsShowingDeleteConfirm(true)}
									size="md"
									disabled={downloadedFilesSum === 0}
								>
									<Text>Delete Downloads</Text>
								</Button>
							</View>
						)}
					</View>

					<View className="flex-1 gap-4">
						<View>
							<Heading>Stored Preferences</Heading>
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

			<Dialog.Container visible={isShowingDeleteConfirm}>
				<Dialog.Title>
					Are you sure you want to delete all downloads from {server?.name || 'this server'}?
				</Dialog.Title>

				<Dialog.Description>This action cannot be undone.</Dialog.Description>

				<Dialog.Button label="Cancel" onPress={() => setIsShowingDeleteConfirm(false)} />
				<Dialog.Button label="Delete" onPress={onDeleteDownloads} color="red" />
			</Dialog.Container>
		</SafeAreaView>
	)
}
