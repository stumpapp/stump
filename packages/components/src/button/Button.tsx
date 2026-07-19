import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { ProgressSpinner } from '../progress/ProgressSpinner'
import { cn } from '../utils'
import { ButtonContext } from './context'

export const BUTTON_BASE_CLASSES = [
	"group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-field-error-border aria-invalid:ring-[3px] aria-invalid:ring-field-error-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
]

export const BUTTON_VARIANTS = {
	default: 'bg-primary text-primary-foreground hover:bg-primary/80',
	outline:
		'border-border bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
	secondary:
		'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
	ghost:
		'hover:bg-muted/80 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
	destructive:
		'bg-destructive/15 text-destructive hover:bg-destructive/25 focus-visible:border-field-error-border focus-visible:ring-field-error-ring',
	link: 'text-primary underline-offset-4 hover:underline',
}

// TODO(cleanup): remove this and just pass class
export const BUTTON_ROUNDED_VARIANTS = {
	default: 'rounded-interactive',
	full: 'rounded-full',
	none: 'rounded-none',
}

export const BUTTON_SIZE_VARIANTS = {
	default: 'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
	lg: 'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
	sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
	xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
	icon: 'size-9',
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
			<ButtonContext.Provider value={{ variant }}>
				<button
					className={cn(
						buttonVariants({ className, rounded, size, variant }),
						{
							'active:scale-95': pressEffect,
							'cursor-not-allowed': props.disabled,
							'focus:ring-ring': primaryFocus,
						},
						className,
					)}
					ref={ref}
					type="button"
					{...props}
				>
					{isLoading ? <ProgressSpinner size={size === 'icon' ? 'sm' : size} /> : children}
				</button>
			</ButtonContext.Provider>
		)
	},
)
Button.displayName = 'Button'

export { Button, buttonVariants }
