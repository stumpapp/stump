import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { ProgressSpinner } from '../progress/ProgressSpinner'
import { cn } from '../utils'
import { ButtonContext } from './context'

export const BUTTON_BASE_CLASSES = [
	'transition-colors hover:bg-background-surface',
	'inline-flex items-center justify-center',
	'text-sm font-medium',
	'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-background',
	'data-[state=open]:bg-background',
	'disabled:opacity-50 disabled:pointer-events-none',
]

// TODO: hone these variants
export const BUTTON_VARIANTS = {
	danger:
		'bg-fill-danger text-white hover:bg-fill-danger-hover dark:hover:bg-fill-danger-hover focus:ring-red-400 dark:focus:ring-red-400',
	default:
		'bg-background-surface hover:bg-background-surface-hover text-foreground focus:ring-edge-brand',
	ghost:
		'bg-transparent hover:bg-background-surface-hover text-foreground-subtle data-[state=open]:bg-transparent',
	'ghost-on-black':
		'bg-transparent hover:bg-background-surface-hover text-foreground-on-black data-[state=open]:bg-transparent',
	link: 'bg-transparent dark:bg-transparent underline-offset-4 hover:underline text-gray-900 dark:text-gray-100 hover:bg-transparent dark:hover:bg-transparent',
	outline: 'bg-transparent border border-edge-subtle hover:bg-background-surface text-foreground',
	primary:
		'bg-fill-brand hover:bg-fill-brand-hover text-white focus:ring-edge-brand data-[state=open]:bg-fill-brand-hover',
	secondary:
		'bg-background-inverse text-foreground-on-inverse hover:bg-background-inverse/90 data-[state=open]:bg-background-inverse/90',
	subtle: 'bg-background-surface hover:bg-background-surface-hover text-foreground-subtle',
	'subtle-dark':
		'bg-background text-foreground-subtle hover:bg-background-surface data-[state=open]:bg-background-surface',
	warning:
		'bg-fill-warning text-foreground hover:bg-fill-warning/80 focus:ring-fill-warning-secondary',
}

export const BUTTON_ROUNDED_VARIANTS = {
	default: 'rounded-md',
	full: 'rounded-full',
	none: 'rounded-none',
}

export const BUTTON_SIZE_VARIANTS = {
	default: 'h-8 py-2 px-3',
	lg: 'h-10 px-4',
	md: 'h-9 px-3',
	sm: 'h-8 px-2',
	xs: 'h-6 px-1',
	icon: 'h-6 w-6',
}

export const BUTTON_NY_SIZE_VARIANTS = {
	default: 'h-7 py-2 px-3',
	lg: 'h-9 px-4',
	md: 'h-8 px-3',
	sm: 'h-7 px-2',
	xs: 'h-5 px-1',
	icon: 'h-6 w-6',
}

const buttonVariants = cva(BUTTON_BASE_CLASSES, {
	compoundVariants: [
		{
			className: BUTTON_NY_SIZE_VARIANTS.default,
			newYork: true,
			size: 'default',
		},
		{
			className: BUTTON_NY_SIZE_VARIANTS.lg,
			newYork: true,
			size: 'lg',
		},
		{
			className: BUTTON_NY_SIZE_VARIANTS.md,
			newYork: true,
			size: 'md',
		},
		{
			className: BUTTON_NY_SIZE_VARIANTS.sm,
			newYork: true,
			size: 'sm',
		},
		{
			className: BUTTON_NY_SIZE_VARIANTS.xs,
			newYork: true,
			size: 'xs',
		},
	],
	defaultVariants: {
		rounded: 'default',
		size: 'default',
		variant: 'default',
	},
	variants: {
		// TODO: remove this new york shit and just create better size variants
		newYork: {
			true: '',
		},
		rounded: BUTTON_ROUNDED_VARIANTS,
		size: BUTTON_SIZE_VARIANTS,
		variant: BUTTON_VARIANTS,
	},
})

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants> & {
		pressEffect?: boolean
		primaryFocus?: boolean
		isLoading?: boolean
	}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			rounded,
			pressEffect = false,
			primaryFocus = true,
			isLoading,
			children,
			newYork,
			...props
		},
		ref,
	) => {
		return (
			<ButtonContext.Provider value={{ variant }}>
				<button
					className={cn(
						buttonVariants({ className, newYork, rounded, size, variant }),
						{
							'active:scale-95': pressEffect,
							'cursor-not-allowed': props.disabled,
							'focus:ring-edge-brand dark:focus:ring-edge-brand': primaryFocus,
						},
						className,
					)}
					ref={ref}
					type="button"
					{...props}
				>
					{isLoading ? (
						<ProgressSpinner
							variant={variant === 'primary' ? 'primary' : 'default'}
							size={size === 'icon' ? 'sm' : size}
						/>
					) : (
						children
					)}
				</button>
			</ButtonContext.Provider>
		)
	},
)
Button.displayName = 'Button'

export { Button, buttonVariants }
