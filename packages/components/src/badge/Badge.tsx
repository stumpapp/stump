import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'

import { cn } from '../utils'

export const BADGE_VARIANTS = {
	default: 'bg-background-surface-secondary text-foreground',
	error: 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-50',
	primary: 'bg-fill-brand-secondary text-fill-brand',
	secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100',
	success: 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-50',
	warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-50',
}

const badgeVariants = cva('inline-flex items-center font-medium', {
	defaultVariants: {
		rounded: 'default',
		size: 'sm',
		variant: 'default',
	},
	variants: {
		rounded: {
			default: 'rounded-md',
			full: 'rounded-full',
		},
		size: {
			lg: 'px-2 py-1 text-base',
			md: 'px-2 py-0.5 text-base',
			sm: 'px-2 py-0.5 text-sm',
			xs: 'px-2.5 py-0.5 text-xs',
		},
		variant: BADGE_VARIANTS,
	},
})

export type BadgeProps = VariantProps<typeof badgeVariants> & ComponentPropsWithoutRef<'div'>
export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
	({ className, variant, size, rounded, ...props }, ref) => {
		return (
			<div
				ref={ref}
				{...props}
				className={cn(badgeVariants({ className, rounded, size, variant }), className)}
			/>
		)
	},
)
Badge.displayName = 'Badge'
