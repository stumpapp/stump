import { Stack, useNavigation, useRouter } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import { Alert, Platform } from 'react-native'

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

	return Platform.select({
		ios: (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Menu icon="ellipsis">
					<Stack.Toolbar.Menu inline>
						{!progression.isCompleted && (
							<Stack.Toolbar.MenuAction icon="book.closed" onPress={handleMarkAsComplete}>
								{t('bookActions.markAsRead.label')}
							</Stack.Toolbar.MenuAction>
						)}

						{progression.hasProgress && (
							<Stack.Toolbar.MenuAction icon="minus.circle" onPress={handleClearProgress}>
								{t('bookActions.clearProgress.label')}
							</Stack.Toolbar.MenuAction>
						)}
					</Stack.Toolbar.Menu>

					<Stack.Toolbar.MenuAction icon="trash" destructive onPress={handleDelete}>
						{t('bookActions.deleteBook.label')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar>
		),
		android: (
			<AndroidOfflineBookMenu
				handleMarkAsComplete={handleMarkAsComplete}
				handleClearProgress={handleClearProgress}
				handleDelete={handleDelete}
				progression={progression}
			/>
		),
	})
}

export function useOfflineBookMenu({ downloadedFile }: { downloadedFile?: DownloadedFile | null }) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android' && downloadedFile) {
			navigation.setOptions({
				headerRight: () => <OfflineBookMenu downloadedFile={downloadedFile} />,
			})
		}
	}, [navigation, downloadedFile])

	if (!downloadedFile) return null

	if (Platform.OS === 'ios') {
		return <OfflineBookMenu downloadedFile={downloadedFile} />
	}

	return null
}
