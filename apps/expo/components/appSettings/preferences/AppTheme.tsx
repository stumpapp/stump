import upperFirst from 'lodash/upperFirst'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { BottomSheet, Text } from '~/components/ui'
import { useColorScheme } from '~/lib/useColorScheme'

import AppSettingsRow from '../AppSettingsRow'
import { Picker } from '@react-native-picker/picker'
import { useCallback, useRef, useState } from 'react'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { cn } from '~/lib/utils'

export default function AppTheme() {
	const { colorScheme, setColorScheme } = useColorScheme()

	const [isOpen, setIsOpen] = useState(false)
	const [isDark, setIsDark] = useState(colorScheme === 'dark')

	const ref = useRef<BottomSheetModal | null>(null)

	const handlePresentModalPress = useCallback(() => {
		if (isOpen) {
			ref.current?.dismiss()
			setIsOpen(false)
		} else {
			ref.current?.present()
			setIsOpen(true)
		}
	}, [isOpen])

	const handleSheetChanged = useCallback(
		(index: number) => {
			if (index === -1 && isOpen) {
				setIsOpen(false)
			}
		},
		[isOpen],
	)

	return (
		<AppSettingsRow icon="Paintbrush" title="Theme">
			<Pressable onPress={handlePresentModalPress}>
				{({ pressed }) => (
					<View className={cn('flex flex-row items-center gap-2', pressed && 'opacity-70')}>
						<Text className="text-foreground-muted">{upperFirst(colorScheme)}</Text>
						<ChevronRight size={20} className="text-foreground-muted" />
					</View>
				)}
			</Pressable>

			<BottomSheet.Modal
				ref={ref}
				index={0}
				snapPoints={['30%']}
				onChange={handleSheetChanged}
				backgroundComponent={(props) => (
					<View {...props} className="rounded-t-xl bg-background shadow-sm" />
				)}
				handleIndicatorStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ccc' }}
			>
				<BottomSheet.View className="flex-1 items-center gap-4 bg-background">
					<View className="flex-1 items-center justify-start">
						<Picker
							style={{ width: 300 }}
							itemStyle={{ fontSize: 20 }}
							selectedValue={colorScheme}
							onValueChange={(itemValue) => setColorScheme(itemValue)}
						>
							<Picker.Item label="Dark" value="dark" />
							<Picker.Item label="Light" value="light" />
						</Picker>
					</View>
				</BottomSheet.View>
			</BottomSheet.Modal>
		</AppSettingsRow>
	)
}
