import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useColorScheme } from 'nativewind'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import { cn } from '~/lib/utils'

import { icons, Text } from '../ui'
import { BottomSheet } from '../ui/bottom-sheet'

const { Plus } = icons

export default function AddServerDialog() {
	const [isOpen, setIsOpen] = useState(false)

	const ref = useRef<BottomSheetModal | null>(null)
	const snapPoints = useMemo(() => ['95%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const { colorScheme } = useColorScheme()

	const handlePresentModalPress = useCallback(() => {
		if (isOpen) {
			ref.current?.dismiss()
			setIsOpen(false)
		} else {
			ref.current?.present()
			setIsOpen(true)
		}
	}, [isOpen])

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
				setIsOpen(false)
			}
		},
		[isOpen],
	)

	return (
		<View>
			<Pressable onPress={handlePresentModalPress}>
				{({ pressed }) => (
					<View
						className={cn(
							'aspect-square flex-1 items-start justify-center pt-0.5',
							pressed && 'opacity-70',
						)}
					>
						<Plus className="text-foreground-muted" size={24} strokeWidth={1.25} />
					</View>
				)}
			</Pressable>

			<BottomSheet.Modal
				ref={ref}
				index={snapPoints.length - 1}
				snapPoints={snapPoints}
				onChange={handleChange}
				backgroundComponent={(props) => <View {...props} className="rounded-t-xl bg-background" />}
				handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ccc' }}
				handleComponent={(props) => (
					<BottomSheet.Handle
						{...props}
						className="mt-2"
						animatedIndex={animatedIndex}
						animatedPosition={animatedPosition}
					/>
				)}
			>
				<BottomSheet.View className="flex-1 items-center bg-background">
					<Text className="mt-10">Awesome 🎉</Text>
				</BottomSheet.View>
			</BottomSheet.Modal>
		</View>
	)
}
