import * as Haptics from 'expo-haptics'
import { Minus, Plus } from 'lucide-react-native'
import { useCallback } from 'react'
import { Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { Icon } from './icon'
import { Text } from './text'

type StepperProps = {
	value: number
	onChange: (value: number) => void
	min?: number
	max?: number
	step?: number
	unit?: string
	disabled?: boolean
	formatValue?: (value: number) => string
	className?: string
	accessibilityLabel?: string
}

export function Stepper({
	value,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	unit,
	disabled = false,
	formatValue,
	className,
	accessibilityLabel,
}: StepperProps) {
	const canDecrement = value > min && !disabled
	const canIncrement = value < max && !disabled

	const handleDecrement = useCallback(() => {
		if (!canDecrement) return
		const newValue = Math.max(min, value - step)
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
		onChange(newValue)
	}, [canDecrement, min, value, step, onChange])

	const handleIncrement = useCallback(() => {
		if (!canIncrement) return
		const newValue = Math.min(max, value + step)
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
		onChange(newValue)
	}, [canIncrement, max, value, step, onChange])

	const displayValue = formatValue ? formatValue(value) : value.toString()

	return (
		<View
			className={cn('flex-row items-center justify-between', className)}
			accessibilityLabel={accessibilityLabel}
			accessibilityRole="adjustable"
			accessibilityValue={{
				min,
				max,
				now: value,
				text: `${displayValue}${unit ?? ''}`,
			}}
		>
			<View className="flex-row items-center">
				<Pressable
					onPress={handleDecrement}
					disabled={!canDecrement}
					className={cn(
						'h-9 w-9 items-center justify-center rounded-l-lg border border-edge bg-background-surface',
						!canDecrement && 'opacity-40',
					)}
					accessibilityLabel="Decrease"
					accessibilityRole="button"
				>
					{({ pressed }) => (
						<Icon
							as={Minus}
							className={cn('h-4 w-4 text-foreground', pressed && canDecrement && 'opacity-70')}
						/>
					)}
				</Pressable>

				<Pressable
					onPress={handleIncrement}
					disabled={!canIncrement}
					className={cn(
						'h-9 w-9 items-center justify-center rounded-r-lg border border-l-0 border-edge bg-background-surface',
						!canIncrement && 'opacity-40',
					)}
					accessibilityLabel="Increase"
					accessibilityRole="button"
				>
					{({ pressed }) => (
						<Icon
							as={Plus}
							className={cn('h-4 w-4 text-foreground', pressed && canIncrement && 'opacity-70')}
						/>
					)}
				</Pressable>
			</View>

			<Text className={cn('ml-4 text-foreground-muted', disabled && 'opacity-40')}>
				{displayValue}
				{unit}
			</Text>
		</View>
	)
}
