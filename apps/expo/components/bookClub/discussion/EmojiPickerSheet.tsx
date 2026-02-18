import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FlashList } from '@shopify/flash-list'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import { Text } from '../../ui'
import { SheetHeader } from '../../ui/SheetHeader'

export type EmojiPickerSheetRef = {
	present: () => void
	dismiss: () => void
}

type Props = {
	onEmojiSelect: (emoji: string) => void
}

// TODO: Load emojis or something idk
// https://github.com/woodybury/rn-emoji-picker/blob/master/src/data/index.ts

export const EmojiPickerSheet = forwardRef<EmojiPickerSheetRef, Props>(({ onEmojiSelect }, ref) => {
	const sheetRef = useRef<TrueSheet>(null)
	const colors = useColors()

	useImperativeHandle(ref, () => ({
		present: () => {
			sheetRef.current?.present()
		},
		dismiss: () => {
			sheetRef.current?.dismiss()
		},
	}))

	const handleEmojiPress = (emoji: string) => {
		sheetRef.current?.dismiss()
		onEmojiSelect(emoji)
	}

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			cornerRadius={24}
			grabber
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{ color: colors.sheet.grabber }}
			header={<SheetHeader title="Emojis" onClose={() => sheetRef.current?.dismiss()} />}
			scrollable
		>
			<FlashList
				data={[]}
				renderItem={() => {
					return (
						<View className="flex-row gap-1 px-4">
							<Text>Foo</Text>
						</View>
					)
				}}
			/>
		</TrueSheet>
	)
})

EmojiPickerSheet.displayName = 'EmojiPickerSheet'
