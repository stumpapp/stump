import { CheckCircle, Menu, RefreshCw, Sparkles, Trash } from 'lucide-react-native'
import { useState } from 'react'
import Dialog from 'react-native-dialog'

import { useDownload, useDownloadsCount, useProgressSync } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'
import { useSelectionStore } from '~/stores/selection'

import { ActionMenu } from '../ui/action-menu/action-menu'
import { useDownloadsState } from './store'

export default function DownloadsHeaderMenu() {
	const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false)

	const { isCuratedDownloadsEnabled, setIsCuratedDownloadsEnabled } = usePreferencesStore(
		(state) => ({
			isCuratedDownloadsEnabled: state.showCuratedDownloads,
			setIsCuratedDownloadsEnabled: (value: boolean) =>
				state.patch({ showCuratedDownloads: value }),
		}),
	)
	const refetchDownloads = useDownloadsState((state) => state.increment)

	const setIsSelecting = useSelectionStore((state) => state.setIsSelecting)

	const { deleteAllDownloads } = useDownload()

	const onDeleteAllDownloads = async () => {
		await deleteAllDownloads()
		refetchDownloads()
		setIsShowingDeleteConfirm(false)
	}

	const downloadsCount = useDownloadsCount()

	const { syncProgress } = useProgressSync()

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
								label: 'Select',
								disabled: downloadsCount === 0,
							},
							{
								icon: {
									ios: 'arrow.trianglehead.2.clockwise.rotate.90',
									android: RefreshCw,
								},
								label: 'Attempt Sync',
								// Note: I removed the guard that checked if there was unsynced local progress since
								// now a sync is always bi-directional (so we might be able to pull)
								onPress: async () => {
									await syncProgress()
									refetchDownloads()
								},
							},
							{
								icon: {
									ios: 'sparkles.rectangle.stack',
									android: Sparkles,
								},
								label: isCuratedDownloadsEnabled ? 'Hide Curated' : 'Show Curated',
								onPress: () => setIsCuratedDownloadsEnabled(!isCuratedDownloadsEnabled),
							},
						],
					},
					{
						items: [
							{
								icon: {
									ios: 'trash',
									android: Trash,
								},
								label: 'Delete Downloads',
								onPress: () => setIsShowingDeleteConfirm(true),
								role: 'destructive',
								disabled: downloadsCount === 0,
							},
						],
					},
				]}
			/>

			<Dialog.Container visible={isShowingDeleteConfirm}>
				<Dialog.Title>Are you sure you want to delete all downloads?</Dialog.Title>

				<Dialog.Description>This action cannot be undone.</Dialog.Description>

				<Dialog.Button label="Cancel" onPress={() => setIsShowingDeleteConfirm(false)} />
				<Dialog.Button label="Delete" onPress={onDeleteAllDownloads} color="red" />
			</Dialog.Container>
		</>
	)
}
