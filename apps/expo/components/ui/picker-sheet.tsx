import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Check, ChevronsUpDown, X } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { useColors, usePalette } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { SheetBackDetection } from '../SheetBackDetection'
import { HeaderButton } from './header-button/header-button'
import { Icon } from './icon'
import { PickerOption, PickerProps } from './picker/types'
import { Text } from './text'

export function PickerSheet<T extends string = string>({
	value,
	options,
	onValueChange,
	disabled = false,
	placeholder = 'Select...',
	className,
}: PickerProps<T>) {
	const sheetRef = useRef<TrueSheet>(null)
	const colors = useColors()

	const [isOpen, setIsOpen] = useState(false)

	const selectedOption = options.find((option) => option.value === value)

	const openPicker = () => {
		sheetRef.current?.present()
	}

	const handleCancel = () => {
		sheetRef.current?.dismiss()
	}

	return (
		<>
			<Pressable onPress={openPicker} disabled={disabled}>
				<View className={cn('gap-2 flex-row items-center justify-between', className)}>
					<Text
						className={cn(
							'text-lg font-normal text-foreground-muted',
							!selectedOption && 'text-foreground-subtle',
						)}
					>
						{selectedOption?.label ?? placeholder}
					</Text>
					<View>
						<Icon as={ChevronsUpDown} size={16} className="text-foreground-subtle" />
					</View>
				</View>
			</Pressable>

			<TrueSheet
				ref={sheetRef}
				detents={[1]}
				grabber
				backgroundColor={colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
				header={
					<View className="px-2 pt-4 pb-2 flex-row justify-between">
						<HeaderButton icon={{ ios: 'xmark', android: X }} onPress={handleCancel} />
					</View>
				}
				scrollable
			>
				<ScrollView className="px-2 flex-1" nestedScrollEnabled>
					{options.map((option) => (
						<PickerSheetOption
							key={option.value}
							option={option}
							selection={value}
							onSelect={(v) => {
								onValueChange(v)
								sheetRef.current?.dismiss()
							}}
						/>
					))}
				</ScrollView>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</>
	)
}

type PickerSheetOptionProps<T extends string> = {
	selection: T
	option: PickerOption<T>
	onSelect: (value: T) => void
}

function PickerSheetOption<T extends string>({
	selection,
	option,
	onSelect,
}: PickerSheetOptionProps<T>) {
	const isSelected = option.value === selection

	const palette = usePalette({
		text: { light: 400, dark: 400 },
		background: { light: 400, dark: 600, opacity: 0.15 },
	})

	return (
		<Pressable onPress={() => onSelect(option.value)}>
			{({ pressed }) => (
				<>
					<View
						className={cn('squircle inset-0 absolute rounded-[1.25rem]')}
						style={[
							{ opacity: pressed ? 0.7 : 1, marginLeft: 6, marginRight: 6 },
							isSelected && { backgroundColor: palette.background },
						]}
					/>
					<View
						className="gap-4 w-full flex-row items-center"
						style={{ opacity: pressed ? 0.7 : 1, paddingLeft: 16, paddingRight: 16 }}
					>
						{isSelected ? <Icon as={Check} /> : <Icon as={Check} className="invisible" />}
						<Text
							className={cn('py-4 text-base flex-1', isSelected && 'font-bold')}
							style={isSelected && { color: palette.text }}
						>
							{option.label}
						</Text>
					</View>
				</>
			)}
		</Pressable>
	)
}
