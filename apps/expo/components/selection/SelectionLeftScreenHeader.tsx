import { Host, Image } from '@expo/ui/swift-ui'
import { ListMinus, ListPlus } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'

import { useSelectionStore } from '~/stores/selection'

import { Icon } from '../ui/icon'

export default function SelectionLeftScreenHeader() {
	const selectionStore = useSelectionStore((state) => state)

	const isSelectAll = selectionStore.isSelectAll()

	const onSelect = () => {
		if (isSelectAll) {
			selectionStore.clearSelection()
		} else if (selectionStore.selectAll) {
			selectionStore.selectAll()
		}
	}

	const PressableChild = Platform.select({
		ios: (
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
						systemName={isSelectAll ? 'rectangle.stack.badge.minus' : 'rectangle.stack.badge.plus'}
						size={20}
					/>
				</Host>
			</View>
		),
		android: (
			<View className="squircle mx-2 h-12 w-12 items-center justify-center rounded-full border border-edge">
				<Icon as={isSelectAll ? ListMinus : ListPlus} size={20} />
			</View>
		),
	})

	return <Pressable onPress={onSelect}>{PressableChild}</Pressable>
}
