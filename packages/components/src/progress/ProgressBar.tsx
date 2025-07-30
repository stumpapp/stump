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

const safeValue = (value: number | null) => {
	if (value === null) return null

	return isNaN(value) ? null : Math.min(100, Math.max(0, value))
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
					className={cn(
						'h-full flex-1 transition-all',
						{
							'origin-left-to-right-indeterminate animate-indeterminate-progress': isIndeterminate,
						},
						indicatorClassName,
					)}
					style={
						isIndeterminate
							? undefined
							: inverted
								? { transform: `translateX(${100 - (adjustedValue || 0)}%)` }
								: { transform: `translateX(-${100 - (adjustedValue || 0)}%)` }
					}
				/>
			</ProgressPrimitive.Root>
		)
	},
)
ProgressBar.displayName = ProgressPrimitive.Root.displayName
