import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { ProgressSpinner } from '../progress/ProgressSpinner'
import { cn } from '../utils'

export const BUTTON_BASE_CLASSES =
	'inline-flex items-center justify-center text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:hover:bg-gray-800 dark:hover:text-gray-100 disabled:opacity-50 dark:focus:ring-gray-400 disabled:pointer-events-none dark:focus:ring-offset-gray-900 data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-gray-800'

export const BUTTON_VARIANTS = {
	danger:
		'bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600 focus:ring-red-400 dark:focus:ring-red-400',
	default:
		'dark:bg-gray-900 dark:text-white dark:hover:bg-gray-700 bg-gray-50 hover:bg-gray-75 text-gray-900 focus:ring-brand-400',
	ghost:
		'bg-transparent hover:bg-gray-75 dark:hover:bg-gray-800 dark:text-gray-100 dark:hover:text-gray-100 data-[state=open]:bg-transparent dark:data-[state=open]:bg-transparent',
	link: 'bg-transparent dark:bg-transparent underline-offset-4 hover:underline text-gray-900 dark:text-gray-100 hover:bg-transparent dark:hover:bg-transparent',
	outline:
		'bg-transparent border border-gray-200 hover:bg-gray-75 dark:border-gray-700 dark:text-gray-100',
	primary:
		'bg-brand-500 text-white hover:bg-brand-600 dark:hover:bg-brand-600 focus:ring-brand-400',
	subtle: 'bg-gray-75 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100',
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

const buttonVariants = cva(BUTTON_BASE_CLASSES, {
	defaultVariants: {
		rounded: 'default',
		size: 'default',
		variant: 'default',
	},
	variants: {
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
			...props
		},
		ref,
	) => {
		return (
			<button
				className={cn(
					buttonVariants({ className, rounded, size, variant }),
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
		)
	},
)
Button.displayName = 'Button'

export { Button, buttonVariants }
