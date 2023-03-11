import * as ProgressPrimitive from '@radix-ui/react-progress'
import React from 'react'

import { cn } from '../utils'

type ProgressBarColorVariants = 'default' | 'primary'
type ColorVariant = Record<ProgressBarColorVariants, string>

export const PROGRESS_BAR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-gray-200 dark:bg-gray-800',
	primary: 'bg-primary-100 dark:bg-primary-800',
}
export const PROGRESS_BAR_INDICATOR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-gray-800 dark:bg-gray-400',
	primary: 'bg-primary-500 dark:bg-primary-400',
}

// TODO: indeterminate state
// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type ProgressBarProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
	className?: string
	value?: number | null
}

export const ProgressBar = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressBarProps
>(({ className, value, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(
			'relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800',
			className,
		)}
		value={value}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className="h-full w-full flex-1 bg-gray-800 transition-all dark:bg-gray-400"
			style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
		/>
	</ProgressPrimitive.Root>
))
ProgressBar.displayName = ProgressPrimitive.Root.displayName
