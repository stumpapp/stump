import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { AlertCircle, CheckCircle, Menu, RefreshCw, Sparkles, Trash } from 'lucide-react-native'
import { useRef } from 'react'
import { Alert } from 'react-native'

import {
	useDownload,
	useDownloadsCount,
	useFailedDownloadsCount,
	useFullSync,
	useTranslate,
} from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'
import { useSelectionStore } from '~/stores/selection'

import { DownloadProblemsSheet } from '../downloadQueue'
import { ActionMenu } from '../ui/action-menu/action-menu'
import { useDownloadsState } from './store'

export default function DownloadsHeaderMenu() {
	const problemsSheetRef = useRef<TrueSheet>(null)

	const isCuratedDownloadsEnabled = usePreferencesStore((state) => state.showCuratedDownloads)
	const patch = usePreferencesStore((state) => state.patch)
	const setIsCuratedDownloadsEnabled = (value: boolean) => patch({ showCuratedDownloads: value })

	const { deleteAllDownloads } = useDownload()

	const refetchDownloads = useDownloadsState((state) => state.increment)
	const setIsSelecting = useSelectionStore((state) => state.setIsSelecting)

	const { t } = useTranslate()

	const onDeleteAllDownloads = async () => {
		await deleteAllDownloads()
		refetchDownloads()
	}

	const confirmDeleteAllDownloads = () => {
		Alert.alert(
			t(getKey('deleteAllDownloads.confirmation')),
			t(getKey('deleteAllDownloads.disclaimer')),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('common.delete'), style: 'destructive', onPress: onDeleteAllDownloads },
			],
		)
	}

	const downloadsCount = useDownloadsCount()
	const failedDownloadsCount = useFailedDownloadsCount()

	const { syncAll } = useFullSync()

	return (
		<>
			<ActionMenu
				icon={{
					ios: 'ellipsis',
					android: Menu,
				}}
				groups={[
					{
						items: [
							{
								icon: {
									ios: 'checkmark.circle',
									android: CheckCircle,
								},
								onPress: () => {
									setIsSelecting(true)
								},
								label: t('common.select'),
								disabled: downloadsCount === 0,
							},
							{
								icon: {
									ios: 'arrow.trianglehead.2.clockwise.rotate.90',
									android: RefreshCw,
								},
								label: t(getKey('attemptSync')),
								// Note: I removed the guard that checked if there was unsynced local progress since
								// now a sync is always bi-directional (so we might be able to pull)
								onPress: async () => {
									await syncAll()
									refetchDownloads()
								},
							},
							{
								icon: {
									ios: 'sparkles.rectangle.stack',
									android: Sparkles,
								},
								label: t(getKey(isCuratedDownloadsEnabled ? 'hideCurated' : 'showCurated')),
								onPress: () => setIsCuratedDownloadsEnabled(!isCuratedDownloadsEnabled),
							},
							...(failedDownloadsCount > 0
								? [
										{
											icon: {
												ios: 'exclamationmark.triangle',
												android: AlertCircle,
											},
											label: t(getKey('seeProblems')).replace(
												'{{problemsCount}}',
												failedDownloadsCount.toString(),
											),
											onPress: () => {
												problemsSheetRef.current?.present()
											},
										} as const,
									]
								: []),
						],
					},
					{
						items: [
							{
								icon: {
									ios: 'trash',
									android: Trash,
								},
								label: t(getKey('deleteAllDownloads.label')),
								onPress: confirmDeleteAllDownloads,
								role: 'destructive',
								disabled: downloadsCount === 0,
							},
						],
					},
				]}
			/>

			<DownloadProblemsSheet ref={problemsSheetRef} />
		</>
	)
}

const LOCALE_BASE = 'localLibrary.downloadsHeaderMenu'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
