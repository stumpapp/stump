import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { ListFilter, LucideIcon } from 'lucide-react-native'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import Animated, { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheet, Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'

import { useAnimatedHeader, useResolvedHeaderHeight } from '../header/useAnimatedHeader'

export interface FilterSheetRef {
	open: () => void
	close: () => void
	toggle: () => void
}

type Props = {
	label: string
	children: React.ReactNode
	isActive?: boolean
	snapPoints?: string[]
	icon?: LucideIcon
	header?: React.ReactNode
}

const FilterSheet = forwardRef<FilterSheetRef, Props>(function FilterSheet(
	{ label, children, isActive, snapPoints, icon, header },
	forwardedRef,
) {
	const [isOpen, setIsOpen] = useState(false)

	const ref = useRef<BottomSheetModal | null>(null)

	const snaps = useMemo(() => snapPoints ?? ['100%'], [snapPoints])
	const animatedIndex = useSharedValue<number>(0)
	const animatedPosition = useSharedValue<number>(0)

	const _Icon = icon ?? ListFilter

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

	useImperativeHandle(
		forwardedRef,
		() => ({
			open: () => {
				ref.current?.present()
				setIsOpen(true)
			},
			close: () => {
				ref.current?.dismiss()
				setIsOpen(false)
			},
			toggle: handlePresentModalPress,
		}),
		[handlePresentModalPress],
	)

	const insets = useSafeAreaInsets()
	const colors = useColors()
	const headerHeight = useResolvedHeaderHeight()

	const {
		scrollHandlerNonWorklet: scrollHandler,
		headerStyle,
		gradientColors,
		gradientLocations,
	} = useAnimatedHeader()

	return (
		<View className="relative flex flex-row">
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
						<Icon as={_Icon} className="ml-2 h-4 w-4 text-foreground-muted" />
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
				<BottomSheet.ScrollView
					onScroll={scrollHandler}
					scrollEventThrottle={16}
					className="flex-1 p-6 pt-0"
					stickyHeaderIndices={header ? [0] : undefined}
				>
					{header && (
						<Animated.View
							style={[headerStyle, { position: 'absolute', top: 0, zIndex: 10, width: '100%' }]}
						>
							<LinearGradient
								colors={gradientColors}
								locations={gradientLocations}
								style={{
									position: 'absolute',
									width: '100%',
									top: 0,
									left: 0,
									right: 0,
									height:
										insets.top * 2 +
										headerHeight / 2 + // use a smaller header for this one
										24, // extra 24 to cover padding
									zIndex: 5,
								}}
								pointerEvents="none"
							/>

							<View
								className="w-full"
								style={{
									zIndex: 10,
								}}
							>
								{header}
							</View>
						</Animated.View>
					)}

					<View
						className="w-full gap-4"
						style={{
							paddingBottom: insets.bottom,
							marginTop: header ? headerHeight / 2 + 24 : 0,
						}}
					>
						{children}
					</View>
				</BottomSheet.ScrollView>
			</BottomSheet.Modal>
		</View>
	)
})

export default FilterSheet
