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
		'bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600 focus:ring-red-400 dark:focus:ring-red-400',
	default:
		'bg-background-surface hover:bg-background-surface-hover text-foreground focus:ring-brand-400',
	ghost:
		'bg-transparent hover:bg-background-surface-hover text-foreground-subtle data-[state=open]:bg-transparent',
	link: 'bg-transparent dark:bg-transparent underline-offset-4 hover:underline text-gray-900 dark:text-gray-100 hover:bg-transparent dark:hover:bg-transparent',
	outline: 'bg-transparent border border-edge-subtle hover:bg-background-surface text-foreground',
	primary:
		'bg-brand-500 text-white hover:bg-brand-600 dark:hover:bg-brand-600 focus:ring-brand-400 data-[state=open]:bg-brand-600',
	secondary: 'bg-inverse text-background hover:bg-inverse/90 data-[state=open]:bg-inverse/90',
	subtle: 'bg-background-surface hover:bg-background-surface-hover text-foreground-subtle',
	'subtle-dark':
		'bg-background text-foreground-subtle hover:bg-background-surface data-[state=open]:bg-background-surface',
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
}

export const BUTTON_NY_SIZE_VARIANTS = {
	default: 'h-7 py-2 px-3',
	lg: 'h-9 px-4',
	md: 'h-8 px-3',
	sm: 'h-7 px-2',
	xs: 'h-5 px-1',
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
							'focus:ring-brand-400 dark:focus:ring-brand-400': primaryFocus,
						},
						className,
					)}
					ref={ref}
					{...props}
				>
					{isLoading ? (
						<ProgressSpinner variant={variant === 'primary' ? 'primary' : 'default'} size={size} />
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
