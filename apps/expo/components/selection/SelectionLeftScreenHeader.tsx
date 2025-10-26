import { Host, Image } from '@expo/ui/swift-ui'
import { Pressable, View } from 'react-native'

import { useSelectionStore } from '~/stores/selection'

export default function SelectionLeftScreenHeader() {
	const selectionStore = useSelectionStore((state) => state)

	const onSelect = () => {
		if (selectionStore.isSelectAll) {
			selectionStore.clearSelection()
		} else if (selectionStore.selectAll) {
			selectionStore.selectAll()
		}
	}

	return (
		<Pressable onPress={onSelect}>
			<View
				accessibilityLabel="options"
				style={{
					height: 35,
					width: 35,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<Host matchContents>
					<Image
						systemName={
							selectionStore.isSelectAll
								? 'rectangle.stack.badge.minus'
								: 'rectangle.stack.badge.plus'
						}
						size={20}
					/>
				</Host>
			</View>
		</Pressable>
	)
}
