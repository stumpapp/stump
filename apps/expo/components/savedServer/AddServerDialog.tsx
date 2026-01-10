import { BottomSheetModal, BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet'
import { Plus } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { useSavedServers } from '~/stores'
import { CreateServer } from '~/stores/savedServer'

import { BottomSheet } from '../ui/bottom-sheet'
import { Icon } from '../ui/icon'
import AddOrEditServerForm from './AddOrEditServerForm'

export default function AddServerDialog() {
	const [isOpen, setIsOpen] = useState(false)

	const ref = useRef<BottomSheetModal | null>(null)
	const scrollRef = useRef<BottomSheetScrollViewMethods>(null)

	const snapPoints = useMemo(() => ['100%'], [])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const { createServer } = useSavedServers()

	const { colorScheme } = useColorScheme()

	const onSubmit = useCallback(
		(data: CreateServer) => {
			createServer(data)
			ref.current?.dismiss()
			setIsOpen(false)
		},
		[createServer],
	)

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

	const insets = useSafeAreaInsets()
	const colors = useColors()

	return (
		<View>
			<Pressable
				onPress={handlePresentModalPress}
				style={
					IS_IOS_24_PLUS
						? {
								width: 35,
								height: 35,
								justifyContent: 'center',
								alignItems: 'center',
							}
						: undefined
				}
			>
				{({ pressed }) => (
					<Icon
						as={Plus}
						className={cn('text-foreground', pressed && 'opacity-70')}
						size={24}
						strokeWidth={1.25}
					/>
				)}
			</Pressable>

			<BottomSheet.Modal
				ref={ref}
				index={snapPoints.length - 1}
				snapPoints={snapPoints}
				enableDynamicSizing={false}
				topInset={insets.top}
				onChange={handleChange}
				backgroundStyle={{
					borderRadius: 24,
					borderCurve: 'continuous',
					overflow: 'hidden',
					borderWidth: 1,
					borderColor: colors.edge.DEFAULT,
					backgroundColor: colors.background.DEFAULT,
				}}
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
				<BottomSheet.KeyboardAwareScrollView ref={scrollRef} className="flex-1 gap-4 p-6">
					<View className="w-full gap-4">
						<AddOrEditServerForm
							onSubmit={onSubmit}
							onClose={() => {
								ref.current?.dismiss()
								setIsOpen(false)
							}}
							// Note: I've added a timeout here because without it I observed the scroll view did not
							// append space for the keyboard in time for the scrollToEnd call, resulting in an
							// "incomplete" scroll
							onInputFocused={() => setTimeout(() => scrollRef.current?.scrollToEnd(), 100)}
						/>
					</View>
				</BottomSheet.KeyboardAwareScrollView>
			</BottomSheet.Modal>
		</View>
	)
}
