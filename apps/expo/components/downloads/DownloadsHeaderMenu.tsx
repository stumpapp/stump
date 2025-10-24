import { RefreshCw, Trash } from 'lucide-react-native'
import { useState } from 'react'
import Dialog from 'react-native-dialog'

import { useDownload } from '~/lib/hooks'

import { ActionMenu } from '../ui/action-menu/action-menu'

export default function DownloadsHeaderMenu() {
	const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false)

	const { deleteAllDownloads } = useDownload()

	const onDeleteAllDownloads = async () => {
		await deleteAllDownloads()
		setIsShowingDeleteConfirm(false)
	}

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
								onPress: () => {
									// TODO: Implement
								},
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
