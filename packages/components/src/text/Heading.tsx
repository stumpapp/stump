import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type As = `h${HeadingLevel}`

export const HEADING_BASE_CLASSES = 'font-semibold'

const headingVariants = cva(HEADING_BASE_CLASSES, {
	defaultVariants: {
		size: 'md',
		variant: 'default',
	},
	variants: {
		size: {
			'2xl': 'text-4xl',
			'3xl': 'text-5xl',
			lg: 'text-2xl',
			md: 'text-xl',
			sm: 'text-lg',
			xl: 'text-3xl',
			xs: 'text-base',
			xxs: 'text-sm',
		},
		variant: {
			default: 'text-foreground',
			gradient: 'bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent',
		},
	},
})

type BaseProps = VariantProps<typeof headingVariants> & React.ComponentPropsWithoutRef<As>
// TODO: truncate option
export type HeadingProps = {
	as?: As
	className?: string
	bold?: boolean
} & BaseProps

export const Heading = React.forwardRef<React.ElementRef<As>, HeadingProps>(
	({ className, as, size, variant, bold, ...props }, ref) => {
		const Component = as ?? 'h1'
		return (
			<Component
				ref={ref}
				className={cn(
					headingVariants({ className, size, variant }),
					{ 'font-bold': bold },
					className,
				)}
				{...props}
			/>
		)
	},
)
Heading.displayName = 'Heading'
