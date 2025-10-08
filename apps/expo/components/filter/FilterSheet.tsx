import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useHeaderHeight } from '@react-navigation/elements'
import { LucideIcon } from 'lucide-react-native'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheet, icons, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'

const { ListFilter } = icons

type Props = {
	label: string
	children: React.ReactNode
	isActive?: boolean
	snapPoints?: string[]
	icon?: LucideIcon
}

export default function FilterSheet({ label, children, isActive, snapPoints, icon }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const ref = useRef<BottomSheetModal | null>(null)
	const snaps = useMemo(() => snapPoints ?? ['100%'], [snapPoints])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const Icon = icon ?? ListFilter

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

	const insets = useSafeAreaInsets()
	const colors = useColors()
	const iosHeaderHeight = useHeaderHeight() // this is not getting the correct android height so
	const androidHeaderHeight = insets.top + 56 // inset + default android header height
	const headerHeight = Platform.OS === 'ios' ? iosHeaderHeight : androidHeaderHeight

	return (
		<View className="flex flex-row">
			<Pressable onPress={handlePresentModalPress}>
				{({ pressed }) => (
					<View
						className={cn(
							'squircle flex flex-grow-0 flex-row items-center justify-center rounded-full bg-background-surface-secondary px-3 py-2',
							pressed && 'opacity-70',
						)}
						style={{
							flex: 0,
							...(isActive
								? {
										backgroundColor: colors.fill.brand.secondary,
									}
								: {}),
						}}
					>
						<Text>{label}</Text>
						<Icon className="ml-2 h-4 w-4 text-foreground-muted" />
					</View>
				)}
			</Pressable>

			<BottomSheet.Modal
				ref={ref}
				index={snaps.length - 1}
				snapPoints={snaps}
				onChange={handleChange}
				topInset={
					headerHeight + // header height
					16 + // top padding
					34 + // FilterHeader height
					16 // bottom padding
				}
				backgroundStyle={{
					borderRadius: 24,
					borderCurve: 'continuous',
					overflow: 'hidden',
					borderWidth: 1,
					borderColor: colors.edge.DEFAULT,
					backgroundColor: colors.background.DEFAULT,
				}}
				stackBehavior="replace"
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
				<BottomSheet.ScrollView className="flex-1 gap-4 p-6">
					<View
						className="w-full gap-4"
						style={{
							paddingBottom: insets.bottom,
						}}
					>
						{children}
					</View>
				</BottomSheet.ScrollView>
			</BottomSheet.Modal>
		</View>
	)
}
