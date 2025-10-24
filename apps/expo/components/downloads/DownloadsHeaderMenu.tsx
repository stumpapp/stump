import { RefreshCw, Trash } from 'lucide-react-native'
import { useState } from 'react'
import Dialog from 'react-native-dialog'

import { useDownload, useProgressSync, useProgressToSyncExists } from '~/lib/hooks'

import { ActionMenu } from '../ui/action-menu/action-menu'
import { useDownloadsFetcherStore } from './store'

export default function DownloadsHeaderMenu() {
	const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false)

	const refetchDownloads = useDownloadsFetcherStore((state) => state.increment)

	const { deleteAllDownloads } = useDownload()

	const onDeleteAllDownloads = async () => {
		await deleteAllDownloads()
		refetchDownloads()
		setIsShowingDeleteConfirm(false)
	}

	const { syncProgress } = useProgressSync()

	const isUnsyncedProgressExists = useProgressToSyncExists()

	return (
		<>
			<ActionMenu
				groups={[
					{
						items: [
							{
								icon: {
									ios: 'icloud.and.arrow.up',
									android: RefreshCw,
								},
								label: 'Attempt Sync',
								onPress: async () => {
									if (isUnsyncedProgressExists) {
										await syncProgress()
										refetchDownloads()
									}
								},
								disabled: !isUnsyncedProgressExists,
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
