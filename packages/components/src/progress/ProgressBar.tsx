import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React, { useMemo } from 'react'

import { cn, cx } from '../utils'

type ProgressBarColorVariants = 'default' | 'primary' | 'primary-dark'
type ColorVariant = Record<ProgressBarColorVariants, string>

export const PROGRESS_BAR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-gray-200 dark:bg-gray-800',
	primary: 'bg-fill-brand-secondary',
	'primary-dark': 'bg-brand-200 dark:bg-brand-250',
}
export const PROGRESS_BAR_INDICATOR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-gray-800 dark:bg-gray-400',
	primary: 'bg-fill-brand/70',
	'primary-dark': 'bg-brand-600 dark:bg-brand-500',
}

const progressVariants = cva('relative overflow-hidden', {
	variants: {
		defaultVariants: {
			rounded: 'default',
			size: 'default',
			variant: 'default',
		},
		rounded: {
			default: 'rounded-full',
			none: '',
		},
		size: {
			default: 'h-2',
			lg: 'h-4',
			sm: 'h-1',
		},
		variant: PROGRESS_BAR_COLOR_VARIANTS,
	},
})

type BaseProps = ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> &
	VariantProps<typeof progressVariants>

// TODO: indeterminate state
// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type ProgressBarProps = {
	className?: string
	value?: number | null
	isIndeterminate?: boolean
} & BaseProps

const safeValue = (value: number | null) => {
	if (value === null) return null

	return isNaN(value) ? null : Math.min(100, Math.max(0, value))
}

export const ProgressBar = React.forwardRef<
	ElementRef<typeof ProgressPrimitive.Root>,
	ProgressBarProps
>(({ className, value, variant, size, rounded, isIndeterminate, ...props }, ref) => {
	const adjustedValue = useMemo(() => safeValue(value ?? null), [value])

	return (
		<ProgressPrimitive.Root
			ref={ref}
			className={cn(
				progressVariants({
					rounded,
					size,
					variant,
				}),
				className,
			)}
			value={adjustedValue}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className={cx(
					'h-full flex-1 transition-all',
					PROGRESS_BAR_INDICATOR_COLOR_VARIANTS[variant || 'default'],
					{
						'origin-left-to-right-indeterminate animate-indeterminate-progress': isIndeterminate,
					},
				)}
				style={
					isIndeterminate ? undefined : { transform: `translateX(-${100 - (adjustedValue || 0)}%)` }
				}
			/>
		</ProgressPrimitive.Root>
	)
})
ProgressBar.displayName = ProgressPrimitive.Root.displayName
