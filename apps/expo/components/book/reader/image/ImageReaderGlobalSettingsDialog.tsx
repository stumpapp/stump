import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { View } from 'lucide-react-native'
import { Fragment, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import { BottomSheet, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'

type Props = {
	isOpen: boolean
	onClose: () => void
}

export default function ImageReaderGlobalSettingsDialog({ isOpen, onClose }: Props) {
	const ref = useRef<BottomSheetModal | null>(null)
	const snapPoints = useMemo(() => ['95%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const { colorScheme } = useColorScheme()

	useEffect(() => {
		if (isOpen) {
			ref.current?.present()
		} else {
			ref.current?.dismiss()
		}
	}, [isOpen])

	const handleChange = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
				onClose()
			}
		},
		[isOpen, onClose],
	)

	return (
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
			<BottomSheet.View className="w-full flex-1 items-start gap-4 bg-background p-6">
				<View>
					{/* <Text className="text-2xl font-bold leading-6">Reader Settings</Text>
					<Text className="text-base text-foreground-muted">
						Configure how all image-based readers should behave
					</Text> */}
				</View>
			</BottomSheet.View>
		</BottomSheet.Modal>
	)
}
