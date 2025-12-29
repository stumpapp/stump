import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { ListFilter, LucideIcon } from 'lucide-react-native'
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'

export interface FilterSheetRef {
	open: () => void
	close: () => void
	toggle: () => void
}

type Props = {
	label: string
	children: React.ReactNode
	isActive?: boolean
	icon?: LucideIcon
	header?: React.ReactNode
}

const FilterSheet = forwardRef<FilterSheetRef, Props>(function FilterSheet(
	{ label, children, isActive, icon, header },
	forwardedRef,
) {
	const [isOpen, setIsOpen] = useState(false)

	const sheetRef = useRef<TrueSheet>(null)

	const _Icon = icon ?? ListFilter

	const { colorScheme } = useColorScheme()
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const handlePresentModalPress = useCallback(() => {
		if (isOpen) {
			sheetRef.current?.dismiss()
		} else {
			sheetRef.current?.present()
		}
	}, [isOpen])

	useImperativeHandle(
		forwardedRef,
		() => ({
			open: () => {
				sheetRef.current?.present()
			},
			close: () => {
				sheetRef.current?.dismiss()
			},
			toggle: handlePresentModalPress,
		}),
		[handlePresentModalPress],
	)

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

			<TrueSheet
				ref={sheetRef}
				detents={['auto', 1]}
				cornerRadius={24}
				grabber
				scrollable
				backgroundColor={colors.background.DEFAULT}
				grabberOptions={{
					color: colorScheme === 'dark' ? '#333' : '#ccc',
				}}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
				style={{
					paddingTop: 12,
					paddingBottom: insets.bottom,
				}}
			>
				<View
					style={{
						flex: 1,
						gap: 0,
					}}
				>
					{header && <View className="w-full px-4">{header}</View>}

					{children}
				</View>
			</TrueSheet>
		</View>
	)
})

export default FilterSheet
