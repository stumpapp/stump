import { Stack, useNavigation, useRouter } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { epubProgress } from '~/db'
import { useDownload, useTranslate } from '~/lib/hooks'

import { SystemAlert } from '../ui/system-alert'
import AndroidOfflineBookMenu from './AndroidOfflineBookMenu'
import { DownloadedFile } from './types'

type Props = {
	downloadedFile: DownloadedFile
}

export default function OfflineBookMenu({ downloadedFile }: Props) {
	const router = useRouter()
	const { translate } = useTranslate()

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
		SystemAlert.alert(
			translate('shared.bookActions.markAsRead.label'),
			translate('shared.bookActions.markAsRead.confirmation', {
				// TODO(translations): don't think this will work for all languages
				bookTitle: downloadedFile.bookName
					? `'${downloadedFile.bookName}'`
					: translate('shared.common.thisBook'),
			}),
			[
				{ text: translate('shared.common.cancel'), style: 'cancel' },
				{
					text: translate('shared.bookActions.markAsRead.label'),
					onPress: () => markAsComplete(downloadedFile.id, downloadedFile.pages),
				},
			],
		)
	}, [markAsComplete, downloadedFile.id, downloadedFile.pages, downloadedFile.bookName, translate])

	const handleClearProgress = useCallback(() => {
		SystemAlert.alert(
			translate('shared.bookActions.clearProgress.label'),
			translate('shared.bookActions.clearProgress.confirmation', {
				// TODO(translations): don't think this will work for all languages
				bookTitle: downloadedFile.bookName
					? `'${downloadedFile.bookName}'`
					: translate('shared.common.thisBook'),
			}),
			[
				{ text: translate('shared.common.cancel'), style: 'cancel' },
				{
					text: translate('shared.common.clear'),
					style: 'destructive',
					onPress: () => clearProgress(downloadedFile.id),
				},
			],
		)
	}, [clearProgress, downloadedFile.id, downloadedFile.bookName, translate])

	const handleDelete = useCallback(() => {
		SystemAlert.alert(
			translate('shared.bookActions.deleteBook.label'),
			translate('shared.bookActions.deleteBook.confirmation').replace(
				'{{bookTitle}}',
				// TODO(translations): don't think this will work for all languages
				downloadedFile.bookName
					? `'${downloadedFile.bookName}'`
					: translate('shared.common.thisBook'),
			),
			[
				{ text: translate('shared.common.cancel'), style: 'cancel' },
				{
					text: translate('shared.common.delete'),
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
	}, [deleteBook, downloadedFile.id, downloadedFile.bookName, translate, router])

	return Platform.select({
		ios: (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Menu icon="ellipsis">
					<Stack.Toolbar.Menu inline>
						{!progression.isCompleted && (
							<Stack.Toolbar.MenuAction icon="book.closed" onPress={handleMarkAsComplete}>
								{translate('shared.bookActions.markAsRead.label')}
							</Stack.Toolbar.MenuAction>
						)}

						{progression.hasProgress && (
							<Stack.Toolbar.MenuAction icon="minus.circle" onPress={handleClearProgress}>
								{translate('shared.bookActions.clearProgress.label')}
							</Stack.Toolbar.MenuAction>
						)}
					</Stack.Toolbar.Menu>

					<Stack.Toolbar.MenuAction icon="trash" destructive onPress={handleDelete}>
						{translate('shared.bookActions.deleteBook.label')}
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
