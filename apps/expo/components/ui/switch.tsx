import * as SwitchPrimitives from '@rn-primitives/switch'
import * as React from 'react'
import { Platform } from 'react-native'
import Animated, {
	interpolateColor,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from 'react-native-reanimated'

import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'

const RGB_COLORS = {
	monochrome: {
		light: {
			primary: 'rgb(24, 24, 27)',
			input: 'rgb(228, 228, 231)',
		},
		dark: {
			primary: 'rgb(250, 250, 250)',
			input: 'rgb(39, 39, 42)',
		},
	},
	brand: {
		light: {
			primary: 'rgb(196, 130, 89)',
			input: 'rgb(228, 228, 231)',
		},
		dark: {
			primary: 'rgb(196, 130, 89)',
			input: 'rgb(39, 39, 42)',
		},
	},
} as const

const SIZES = {
	sm: {
		view: 'h-7 w-[42px]',
		root: 'h-7 w-[42px]',
		thumb: 'h-6 w-6',
	},
	default: {
		view: 'h-8 w-[46px]',
		root: 'h-8 w-[46px]',
		thumb: 'h-7 w-7',
	},
}

type Props = {
	variant?: keyof typeof RGB_COLORS
	size?: keyof typeof SIZES
} & SwitchPrimitives.RootProps

const SwitchNative = React.forwardRef<SwitchPrimitives.RootRef, Props>(
	({ className, variant = 'brand', size = 'default', ...props }, ref) => {
		const { colorScheme } = useColorScheme()
		const translateX = useDerivedValue(() => (props.checked ? 18 : 0))
		const colors = RGB_COLORS[variant][colorScheme]
		const animatedRootStyle = useAnimatedStyle(() => {
			return {
				backgroundColor: interpolateColor(
					translateX.value,
					[0, 18],
					[colors.input, colors.primary],
				),
			}
		})
		const animatedThumbStyle = useAnimatedStyle(() => ({
			transform: [{ translateX: withTiming(translateX.value, { duration: 200 }) }],
		}))
		const resolvedSize = SIZES[size] || SIZES.default

		return (
			<Animated.View
				style={animatedRootStyle}
				className={cn('rounded-full', resolvedSize.view, props.disabled && 'opacity-50')}
			>
				<SwitchPrimitives.Root
					className={cn(
						'shrink-0 flex-row items-center rounded-full border-2 border-transparent',
						resolvedSize.root,
						props.checked ? 'bg-primary' : 'bg-input',
						className,
					)}
					{...props}
					ref={ref}
				>
					<Animated.View style={animatedThumbStyle}>
						<SwitchPrimitives.Thumb
							className={cn(
								'rounded-full bg-background shadow-md shadow-foreground/25 ring-0',
								resolvedSize.thumb,
								{
									'bg-white': variant === 'brand',
								},
							)}
						/>
					</Animated.View>
				</SwitchPrimitives.Root>
			</Animated.View>
		)
	},
)
SwitchNative.displayName = 'SwitchNative'

const Switch = Platform.select({
	default: SwitchNative,
})

export { Switch }
