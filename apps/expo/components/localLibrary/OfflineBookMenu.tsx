import { Button, ContextMenu, Divider, Host } from '@expo/ui/swift-ui'
import { useRouter } from 'expo-router'
import { Ellipsis } from 'lucide-react-native'
import { useCallback, useMemo } from 'react'
import { Alert, Platform, View } from 'react-native'

import { Icon } from '~/components/ui'
import { epubProgress } from '~/db'
import { useDownload, useTranslate } from '~/lib/hooks'

import AndroidOfflineBookMenu from './AndroidOfflineBookMenu'
import { DownloadedFile } from './types'

type Props = {
	downloadedFile: DownloadedFile
}

export default function OfflineBookMenu({ downloadedFile }: Props) {
	const router = useRouter()
	const { t } = useTranslate()

	const { deleteBook, markAsComplete, clearProgress } = useDownload({
		serverId: downloadedFile.serverId,
	})

	const readProgress = useMemo(() => downloadedFile.readProgress, [downloadedFile])
	const epubProgression = epubProgress.safeParse(readProgress?.epubProgress).data
	const currentPage = useMemo(
		() => readProgress?.page || epubProgression?.locations?.position,
		[readProgress, epubProgression],
	)
	const totalPages = downloadedFile.pages

	const progression = useMemo(() => {
		if (!readProgress) {
			return { isCompleted: false, hasProgress: false }
		}

		if (totalPages != null && currentPage != null && totalPages > 0 && currentPage >= totalPages) {
			return { isCompleted: true, hasProgress: true }
		}

		if (readProgress.percentage) {
			const parsed = parseFloat(readProgress.percentage)
			if (!isNaN(parsed) && parsed >= 0.99) {
				return { isCompleted: true, hasProgress: true }
			}
		}

		return { isCompleted: false, hasProgress: true }
	}, [readProgress, currentPage, totalPages])

	const handleMarkAsComplete = useCallback(() => {
		Alert.alert(
			t('bookActions.markAsRead.label'),
			t('bookActions.markAsRead.confirmation').replace(
				'{{bookTitle}}',
				downloadedFile.bookName ? `'${downloadedFile.bookName}'` : t('common.thisBook'),
			),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('bookActions.markAsRead.label'),
					onPress: () => markAsComplete(downloadedFile.id, downloadedFile.pages),
				},
			],
		)
	}, [markAsComplete, downloadedFile.id, downloadedFile.pages, downloadedFile.bookName, t])

	const handleClearProgress = useCallback(() => {
		Alert.alert(
			t('bookActions.clearProgress.label'),
			t('bookActions.clearProgress.confirmation').replace(
				'{{bookTitle}}',
				downloadedFile.bookName ? `'${downloadedFile.bookName}'` : t('common.thisBook'),
			),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.clear'),
					style: 'destructive',
					onPress: () => clearProgress(downloadedFile.id),
				},
			],
		)
	}, [clearProgress, downloadedFile.id, downloadedFile.bookName, t])

	const handleDelete = useCallback(() => {
		Alert.alert(
			t('bookActions.deleteBook.label'),
			t('bookActions.deleteBook.confirmation').replace(
				'{{bookTitle}}',
				downloadedFile.bookName ? `'${downloadedFile.bookName}'` : t('common.thisBook'),
			),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: () => {
						deleteBook(downloadedFile.id)
						if (router.canGoBack()) {
							router.back()
						}
					},
				},
			],
		)
	}, [deleteBook, downloadedFile.id, downloadedFile.bookName, t, router])

	if (Platform.OS === 'android') {
		return (
			<AndroidOfflineBookMenu
				handleMarkAsComplete={handleMarkAsComplete}
				handleClearProgress={handleClearProgress}
				handleDelete={handleDelete}
				progression={progression}
			/>
		)
	}

	return (
		<Host matchContents>
			<ContextMenu>
				<ContextMenu.Trigger>
					<View
						accessibilityLabel="options"
						style={{
							height: 35,
							width: 35,
							justifyContent: 'center',
							alignItems: 'center',
						}}
					>
						<Icon as={Ellipsis} size={24} className="text-foreground" />
					</View>
				</ContextMenu.Trigger>
				<ContextMenu.Items>
					{!progression.isCompleted && (
						<Button
							systemImage="book.closed"
							onPress={handleMarkAsComplete}
							label={t('bookActions.markAsRead.label')}
						/>
					)}

					{progression.hasProgress && (
						<Button
							systemImage="minus.circle"
							onPress={handleClearProgress}
							label={t('bookActions.clearProgress.label')}
						/>
					)}

					<Divider />

					<Button
						systemImage="trash"
						role="destructive"
						onPress={handleDelete}
						label={t('bookActions.deleteBook.label')}
					/>
				</ContextMenu.Items>
			</ContextMenu>
		</Host>
	)
}
