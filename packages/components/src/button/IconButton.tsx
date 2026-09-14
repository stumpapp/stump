import { cva, VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

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
			lg: 'size-10',
			md: 'size-9',
			sm: 'size-8',
			xs: "size-6 [&_svg:not([class*='size-'])]:size-3",
			xxs: "size-5 [&_svg:not([class*='size-'])]:size-3",
		},
		variant: BUTTON_VARIANTS,
	},
})

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof iconButtonVariants> & {
		primaryFocus?: boolean
	}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	({ className, variant, size, rounded, primaryFocus = true, ...props }, ref) => {
		return (
			<button
				className={cn(
					iconButtonVariants({ className, rounded, size, variant }),
					{
						'cursor-not-allowed': props.disabled,
						'focus:ring-ring': primaryFocus,
					},
					className,
				)}
				ref={ref}
				type="button"
				{...props}
			/>
		)
	},
)
IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }
