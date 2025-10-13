import { Host, Switch as IosSwitch } from '@expo/ui/swift-ui'
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
import { usePreferencesStore } from '~/stores'

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
	tiny: {
		view: 'h-5 w-[30px]',
		root: 'h-5 w-[30px]',
		thumb: 'h-4 w-4',
		translateX: 13,
	},
	sm: {
		view: 'h-7 w-[42px]',
		root: 'h-7 w-[42px]',
		thumb: 'h-6 w-6',
		translateX: 16,
	},
	default: {
		view: 'h-8 w-[46px]',
		root: 'h-8 w-[46px]',
		thumb: 'h-7 w-7',
		translateX: 18,
	},
}

type Props = {
	variant?: keyof typeof RGB_COLORS
	size?: keyof typeof SIZES
} & SwitchPrimitives.RootProps

const Switch = React.forwardRef<SwitchPrimitives.RootRef, Props>(
	({ className, variant = 'brand', size = 'default', ...props }, ref) => {
		const { colorScheme } = useColorScheme()
		const accentColor = usePreferencesStore((state) => state.accentColor)
		const xValue = SIZES[size]?.translateX || SIZES.default.translateX
		const translateX = useDerivedValue(() => (props.checked ? xValue : 0))
		const defaultColors = RGB_COLORS[variant][colorScheme]
		const colors = {
			...defaultColors,
			primary: accentColor || defaultColors.primary,
		}
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

		if (Platform.OS === 'ios') {
			return (
				<Host matchContents>
					<IosSwitch
						value={props.checked}
						onValueChange={(checked) => {
							props.onCheckedChange?.(checked)
						}}
						color={colors.primary}
						variant="switch"
					/>
				</Host>
			)
		}

		return (
			<Animated.View
				style={animatedRootStyle}
				className={cn('squircle rounded-full', resolvedSize.view, props.disabled && 'opacity-50')}
			>
				<SwitchPrimitives.Root
					className={cn(
						'squircle shrink-0 flex-row items-center rounded-full border border-transparent',
						resolvedSize.root,
						className,
					)}
					{...props}
					ref={ref}
				>
					<Animated.View style={animatedThumbStyle}>
						<SwitchPrimitives.Thumb
							className={cn(
								'squircle rounded-full bg-background shadow-md shadow-foreground/25',
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
Switch.displayName = 'Switch'

export { Switch }
