import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'

import { cn } from '../utils'

export const BADGE_VARIANTS = {
	default: 'bg-primary text-primary-foreground',
	error: 'bg-destructive/15 text-destructive focus-visible:ring-field-error-ring',
	primary: 'bg-primary/15 text-primary',
	secondary: 'bg-secondary text-secondary-foreground',
	success: 'bg-success/15 text-success',
	warning: 'bg-warning/15 text-warning',
}

const badgeVariants = cva(
	'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-field-error-border aria-invalid:ring-field-error-ring',
	{
		defaultVariants: {
			rounded: 'default',
			size: 'sm',
			variant: 'default',
		},
		variants: {
			rounded: {
				default: 'rounded-4xl',
				full: 'rounded-full',
			},
			size: {
				lg: 'h-6 px-2.5 py-1 text-sm',
				md: 'h-5 px-2 py-0.5 text-xs',
				sm: 'h-5 px-2 py-0.5 text-xs',
				xs: 'h-4 px-1.5 py-0 text-[10px]',
			},
			variant: BADGE_VARIANTS,
		},
	},
)

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
