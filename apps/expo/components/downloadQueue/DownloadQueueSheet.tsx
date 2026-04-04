import { Host, Picker } from '@expo/ui/swift-ui'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { forwardRef, useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '~/lib/constants'
import { useDownloadQueue, useTranslate } from '~/lib/hooks'

import Owl from '../Owl'
import { Card, Tabs } from '../ui'
import { Text } from '../ui/text'
import DownloadQueueItem from './DownloadQueueItem'
import FailedDownloadItem from './FailedDownloadItem'

type Props = {
	onDismiss?: () => void
}

export const DownloadQueueSheet = forwardRef<TrueSheet, Props>(function DownloadQueueSheet(
	{ onDismiss },
	ref,
) {
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [tab, setTab] = useState<'HEALTHY' | 'FAILED'>('HEALTHY')

	const { t } = useTranslate()
	const { pendingItems, activeItems, failedItems, cancel, retry, dismiss } = useDownloadQueue()

	const activeAndPendingItems = [...activeItems, ...pendingItems]

	// Note: Leaving these here for future self (you are welcome lazy future self)
	// const activeAndPendingItems = Array.from({ length: 8 }, (_, i) => ({
	// 	progress: { totalBytes: 1000, downloadedBytes: 500, percentage: i % 2 === 0 ? 50 : 85 },
	// 	id: i + 1,
	// 	bookId: `book-${i + 1}`,
	// 	serverId: 'server1',
	// 	status: i < 3 ? 'downloading' : 'pending',
	// 	downloadUrl: `http://example.com/book${i + 1}`,
	// 	filename: `book${i + 1}.epub`,
	// 	extension: 'epub',
	// 	metadata: { bookName: `Example Book ${i + 1}` },
	// 	createdAt: new Date(),
	// 	failureReason: null,
	// }))

	// const failedItems_ = Array.from({ length: 3 }, (_, i) => ({
	// 	progress: null,
	// 	id: i + 101,
	// 	bookId: `book-${i + 101}`,
	// 	serverId: 'server1',
	// 	status: 'failed' as const,
	// 	downloadUrl: `http://example.com/book${i + 101}`,
	// 	filename: `book${i + 101}.epub`,
	// 	extension: 'epub',
	// 	metadata: { bookName: `Failed Book ${i + 1}` },
	// 	createdAt: new Date(),
	// 	failureReason: 'Network error',
	// }))

	const isTotalEmptyState = activeAndPendingItems.length === 0 && failedItems.length === 0

	return (
		<TrueSheet
			ref={ref}
			detents={[0.65, 1]}
			cornerRadius={24}
			grabber
			scrollable
			backgroundColor={colors.sheet.background}
			grabberOptions={{
				color: colors.sheet.grabber,
			}}
			style={{
				paddingBottom: insets.bottom + 16,
			}}
			onDidDismiss={onDismiss}
			insetAdjustment="automatic"
			header={
				<View className="gap-4 px-6 pt-8">
					<View className="pb-2 w-full">
						{Platform.select({
							ios: (
								<View className="w-full">
									<Host matchContents style={{ width: 'auto' }}>
										<Picker
											options={['Downloading', 'Failed']}
											selectedIndex={tab === 'HEALTHY' ? 0 : 1}
											onOptionSelected={({ nativeEvent: { index } }) => {
												setTab(index === 0 ? 'HEALTHY' : 'FAILED')
											}}
											variant="segmented"
										/>
									</Host>
								</View>
							),
							android: (
								<Tabs value={tab} onValueChange={(value) => setTab(value as 'HEALTHY' | 'FAILED')}>
									<Tabs.List className="flex-row">
										<Tabs.Trigger value="HEALTHY">
											<Text>{t('downloadQueue.downloading')}</Text>
										</Tabs.Trigger>

										<Tabs.Trigger value="FAILED">
											<Text>{t('downloadQueue.failed')}</Text>
										</Tabs.Trigger>
									</Tabs.List>
								</Tabs>
							),
						})}
					</View>
				</View>
			}
		>
			<ScrollView className="p-6 flex-1" nestedScrollEnabled>
				<View className="gap-y-6">
					{isTotalEmptyState && (
						<View className="gap-4 py-8 items-center justify-center">
							<Owl owl="empty" />
							<Text className="text-lg text-foreground-muted">
								{t('downloadQueue.nothingDownloading')}
							</Text>
						</View>
					)}

					{activeAndPendingItems.length > 0 && tab === 'HEALTHY' && (
						<Card className="gap-0">
							{activeAndPendingItems.map((item) => (
								<DownloadQueueItem key={item.id} item={item} onCancel={cancel} />
							))}
						</Card>
					)}

					{activeAndPendingItems.length === 0 && tab === 'HEALTHY' && !isTotalEmptyState && (
						<View className="gap-4 py-8 items-center justify-center">
							<Owl owl="empty" />
							<Text className="text-lg text-foreground-muted">
								{t('downloadQueue.noActiveDownloads')}
							</Text>
						</View>
					)}

					{failedItems.length > 0 && tab === 'FAILED' && (
						<Card>
							{failedItems.map((item) => (
								<FailedDownloadItem key={item.id} item={item} onRetry={retry} onDismiss={dismiss} />
							))}
						</Card>
					)}

					{failedItems.length === 0 && tab === 'FAILED' && !isTotalEmptyState && (
						<View className="gap-4 py-8 items-center justify-center">
							<Owl owl="empty" />
							<Text className="text-lg text-foreground-muted">
								{t('downloadQueue.noFailedDownloads')}
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</TrueSheet>
	)
})
