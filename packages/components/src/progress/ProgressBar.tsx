import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React, { useMemo } from 'react'

import { cn } from '../utils'

type ProgressBarColorVariants = 'default' | 'primary' | 'primary-dark'
type ColorVariant = Record<ProgressBarColorVariants, string>

export const PROGRESS_BAR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-background-surface',
	primary: 'bg-fill-brand-secondary',
	'primary-dark': 'bg-brand-200 dark:bg-brand-250',
}
export const PROGRESS_BAR_INDICATOR_COLOR_VARIANTS: ColorVariant = {
	default: 'bg-foreground',
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

// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type ProgressBarProps = {
	className?: string
	value?: number | null
	isIndeterminate?: boolean
	indicatorClassName?: string
	/**
	 * When true, the progress bar fills from right to left instead of left to right.
	 * Useful for RTL (right-to-left) reading directions.
	 */
	inverted?: boolean
} & BaseProps

const safeValue = (value: number | null, max = 100) => {
	if (value === null) return null

	return isNaN(value) ? null : Math.min(max, Math.max(0, value))
}

const calculatePercentage = (value: number | null, max = 100) => {
	if (value === null || max <= 0) return 0
	return Math.min(100, Math.max(0, (value / max) * 100))
}

export const ProgressBar = React.forwardRef<
	ElementRef<typeof ProgressPrimitive.Root>,
	ProgressBarProps
>(
	(
		{
			className,
			value,
			variant,
			size,
			rounded = 'default',
			isIndeterminate,
			indicatorClassName,
			inverted = false,
			...props
		},
		ref,
	) => {
		const adjustedValue = useMemo(() => safeValue(value ?? null, props.max), [value, props.max])

		const percentage = useMemo(
			() => calculatePercentage(adjustedValue, props.max),
			[adjustedValue, props.max],
		)

		const style = useMemo(() => {
			if (isIndeterminate) {
				return undefined
			} else {
				return inverted
					? { transform: `translateX(${100 - percentage}%)` }
					: { transform: `translateX(-${100 - percentage}%)` }
			}
		}, [isIndeterminate, inverted, percentage])

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
					className={cn(
						'h-full flex-1 transition-all',
						PROGRESS_BAR_INDICATOR_COLOR_VARIANTS[variant || 'default'],
						{
							'origin-left-to-right-indeterminate animate-indeterminate-progress': isIndeterminate,
						},
						indicatorClassName,
					)}
					style={style}
				/>
			</ProgressPrimitive.Root>
		)
	},
)
ProgressBar.displayName = ProgressPrimitive.Root.displayName
