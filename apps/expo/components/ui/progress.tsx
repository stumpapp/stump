import * as ProgressPrimitive from '@rn-primitives/progress'
import { BlurView, BlurViewProps } from 'expo-blur'
import * as React from 'react'
import { View } from 'react-native'
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedStyle,
	useDerivedValue,
	withSpring,
} from 'react-native-reanimated'

import { cn } from '~/lib/utils'

type Props = {
	indicatorClassName?: string
	trackClassName?: string
	inverted?: boolean
	blurProps?: BlurViewProps
} & ProgressPrimitive.RootProps

const Progress = React.forwardRef<ProgressPrimitive.RootRef, Props>(
	(
		{ className, value, indicatorClassName, trackClassName, inverted, blurProps, ...props },
		ref,
	) => {
		return (
			<ProgressPrimitive.Root
				ref={ref}
				className={cn(
					'squircle h-4 relative w-full overflow-hidden rounded-full',
					{ 'rotate-180 transform': inverted },
					className,
				)}
				{...props}
			>
				{blurProps ? (
					<BlurView {...blurProps}>
						<View className={cn('bg-background-surface-secondary', trackClassName)}>
							<Indicator value={value} className={indicatorClassName} />
						</View>
					</BlurView>
				) : (
					<View className={cn('bg-background-surface-secondary', trackClassName)}>
						<Indicator value={value} className={indicatorClassName} />
					</View>
				)}
			</ProgressPrimitive.Root>
		)
	},
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

type IndicatorProps = {
	value: number | undefined | null
	className?: string
}

function Indicator({ value, className }: IndicatorProps) {
	const progress = useDerivedValue(() => value ?? 0)

	const indicator = useAnimatedStyle(() => {
		return {
			width: withSpring(
				`${interpolate(progress.value, [0, 100], [1, 100], Extrapolation.CLAMP)}%`,
				{ overshootClamping: true },
			),
		}
	})

	return (
		<ProgressPrimitive.Indicator asChild>
			<Animated.View style={indicator} className={cn('h-full bg-foreground', className)} />
		</ProgressPrimitive.Indicator>
	)
}
