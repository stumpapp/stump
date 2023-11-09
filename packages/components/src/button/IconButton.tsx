import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'
import { BUTTON_BASE_CLASSES, BUTTON_ROUNDED_VARIANTS, BUTTON_VARIANTS } from './Button'

const iconButtonVariants = cva(BUTTON_BASE_CLASSES, {
	defaultVariants: {
		rounded: 'default',
		size: 'sm',
		variant: 'default',
	},
	variants: {
		rounded: BUTTON_ROUNDED_VARIANTS,
		size: {
			lg: 'p-3',
			md: 'p-2',
			sm: 'p-2',
			xs: 'p-1',
			xxs: 'p-0.5',
		},
		variant: BUTTON_VARIANTS,
	},
})

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof iconButtonVariants> & {
		pressEffect?: boolean
		primaryFocus?: boolean
	}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
	(
		{ className, variant, size, rounded, pressEffect = true, primaryFocus = true, ...props },
		ref,
	) => {
		return (
			<button
				className={cn(
					iconButtonVariants({ className, rounded, size, variant }),
					{
						'active:scale-95': pressEffect,
						'cursor-not-allowed': props.disabled,
						'focus:ring-brand-400 dark:focus:ring-brand-400': primaryFocus,
					},
					className,
				)}
				ref={ref}
				{...props}
			/>
		)
	},
)
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
