import { Host, Image } from '@expo/ui/swift-ui'
import { CheckCircle2, Share, Trash } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import Dialog from 'react-native-dialog'

import { useSelectionStore } from '~/stores/selection'

import { ActionMenu } from '../ui/action-menu/action-menu'
import { Icon } from '../ui/icon'

// TODO: Redesign after https://github.com/software-mansion/react-native-screens/issues/2990#issuecomment-3448692775

export default function SelectionRightScreenHeader() {
	const onStopSelection = useSelectionStore((state) => state.resetSelection)
	const currentSelection = useSelectionStore((state) => state.selectionState)
	const customActions = useSelectionStore((state) => state.customActions)

	const deleteAction = useMemo(() => customActions['deleteSelection'], [customActions])

	const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false)

	const onDeleteSelection = useCallback(async () => {
		if (deleteAction) {
			await deleteAction(Array.from(currentSelection))
			setIsShowingDeleteConfirm(false)
			onStopSelection()
		}
	}, [currentSelection, deleteAction, onStopSelection])

	return (
		<>
			<View
				style={{
					flexDirection: 'row',
					gap: 10,
					alignItems: 'center',
				}}
			>
				<View
					accessibilityLabel="options"
					style={{
						height: 35,
						width: 35,
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<Pressable onPress={onStopSelection}>{CheckIcon}</Pressable>
				</View>

				<ActionMenu
					disabled={currentSelection.size === 0}
					groups={[
						{
							items: [
								{
									label: 'Share',
									icon: {
										ios: 'square.and.arrow.up',
										android: Share,
									},
									onPress: () => {},
									disabled: true,
								},
							],
						},
						{
							items: [
								{
									label: 'Delete',
									icon: {
										ios: 'trash',
										android: Trash,
									},
									onPress: onDeleteSelection,
									role: 'destructive',
									disabled: !deleteAction,
								},
							],
						},
					]}
				/>
			</View>

			<Dialog.Container visible={isShowingDeleteConfirm}>
				<Dialog.Title>
					Delete {currentSelection.size} download
					{currentSelection.size > 1 ? 's' : ''}
				</Dialog.Title>

				<Dialog.Description>This action cannot be undone.</Dialog.Description>

				<Dialog.Button label="Cancel" onPress={() => setIsShowingDeleteConfirm(false)} />
				<Dialog.Button label="Delete" onPress={onDeleteSelection} color="red" />
			</Dialog.Container>
		</>
	)
}

const CheckIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="checkmark.circle.fill" size={25} />
		</Host>
	),
	android: <Icon as={CheckCircle2} size={20} className="shadow" />,
})
