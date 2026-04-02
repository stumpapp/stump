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
import { useDownload, useTranslate } from '~/lib/hooks'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { useReaderStore } from '~/stores'
import { useSavedServerStore } from '~/stores/savedServer'

export default function Screen() {
	const { id: serverID } = useLocalSearchParams<{ id: string }>()
	const { t } = useTranslate()
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
	const onDeleteDownloads = async () => {
		try {
			await deleteServerDownloads(serverID)
			refetch()
		} catch {
			Alert.alert(
				t(getKey('deleteDownloads.deleteFailed.title')),
				t(getKey('deleteDownloads.deleteFailed.description')).replace(
					'{{serverName}}',
					server?.name ? `'${server.name}'` : t('common.thisServer'),
				),
			)
		}
	}

	useDynamicHeader({
		title: server?.name || '',
	})

	const handleDelete = () => {
		Alert.alert(
			t(getKey('deleteDownloads.label')),
			t(getKey('deleteDownloads.confirmation')).replace(
				'{{serverName}}',
				server?.name ? `'${server.name}'` : t('common.thisServer'),
			),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('common.delete'), style: 'destructive', onPress: onDeleteDownloads },
			],
		)
	}

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
				<View className="gap-8 px-4 pt-8 flex-1 bg-background">
					<View className="gap-4 flex-1">
						<Card
							label={t('common.downloads')}
							listEmptyStyle={{
								icon: HardDriveDownload,
								message: t(getKey('noDownloads')),
							}}
						>
							<Card.StatGroup>
								<Card.Stat label={t(getKey('totalFiles'))} value={downloadedFilesCount} />
								{humanizedUsage && (
									<Card.Stat label={t(getKey('totalSize'))} value={humanizedUsage} />
								)}
							</Card.StatGroup>

							{(files.length > 0 || downloadedFilesSum > 0) && (
								<Card.Row label={t(getKey('deleteDownloads.label'))}>
									<Button size="sm" roundness="full" variant="destructive" onPress={handleDelete}>
										<Text>{t('common.delete')}</Text>
									</Button>
								</Card.Row>
							)}
						</Card>
					</View>

					<View className="gap-4 flex-1">
						<Card
							label={t(getKey('storedPreferences.label'))}
							description={t(getKey('storedPreferences.description'))}
						>
							<Card.StatGroup>
								<Card.Stat label={t(getKey('totalSize'))} value={preferencesSize} />
							</Card.StatGroup>

							{!!preferencesBytes && (
								<Card.Row label={t(getKey('clearPreferences'))}>
									<Button
										size="sm"
										roundness="full"
										variant="destructive"
										onPress={onClearPreferences}
									>
										<Text>{t('common.clear')}</Text>
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

const LOCALE_BASE = 'settings.management.dataUsage'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
