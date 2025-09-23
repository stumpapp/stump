import * as ProgressPrimitive from '@rn-primitives/progress'
import * as React from 'react'
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
	inverted?: boolean
} & ProgressPrimitive.RootProps

const Progress = React.forwardRef<ProgressPrimitive.RootRef, Props>(
	({ className, value, indicatorClassName, inverted, ...props }, ref) => {
		return (
			<ProgressPrimitive.Root
				ref={ref}
				className={cn(
					'squircle relative h-4 w-full overflow-hidden rounded-full bg-background-surface',
					{ 'rotate-180 transform': inverted },
					className,
				)}
				{...props}
			>
				<Indicator value={value} className={indicatorClassName} />
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
