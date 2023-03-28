import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn, cx } from '../utils'

type ProgressBarColorVariants = 'default' | 'primary'
type ColorVariant = Record<ProgressBarColorVariants, string>

export const PROGRESS_BAR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-gray-200 dark:bg-gray-800',
	primary: 'bg-brand-100 dark:bg-brand-300/80',
}
export const PROGRESS_BAR_INDICATOR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-gray-800 dark:bg-gray-400',
	primary: 'bg-brand-500 dark:bg-brand-400',
}

const progressVariants = cva('relative w-full overflow-hidden rounded-full', {
	variants: {
		size: {
			default: 'h-2',
			lg: 'h-4',
			sm: 'h-1',
		},
		variant: PROGRESS_BAR_COLOR_VARIANTS,
	},
})

type BaseProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> &
	VariantProps<typeof progressVariants>

// TODO: indeterminate state
// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type ProgressBarProps = {
	className?: string
	value?: number | null
} & BaseProps

export const ProgressBar = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressBarProps
>(({ className, value, variant, size, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(
			progressVariants({
				size,
				variant,
			}),
			className,
		)}
		value={value}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className={cx(
				'h-full w-full flex-1 transition-all',
				PROGRESS_BAR_INDICATOR_COLOR_VARIANTS[variant || 'default'],
			)}
			style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
		/>
	</ProgressPrimitive.Root>
))
ProgressBar.displayName = ProgressPrimitive.Root.displayName
