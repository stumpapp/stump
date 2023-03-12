import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type As = `h${HeadingLevel}`

export const HEADING_BASE_CLASSES = 'dark:text-gray-100 font-semibold'

const headingVariants = cva(HEADING_BASE_CLASSES, {
	defaultVariants: {
		size: 'md',
	},
	variants: {
		size: {
			'2xl': 'text-4xl',
			lg: 'text-2xl',
			md: 'text-xl',
			sm: 'text-lg',
			xl: 'text-3xl',
			xs: 'text-base',
		},
	},
})

type BaseProps = VariantProps<typeof headingVariants> & React.ComponentPropsWithoutRef<As>
// TODO: truncate option
export type HeadingProps = {
	as?: As
	className?: string
} & BaseProps

export const Heading = React.forwardRef<React.ElementRef<As>, HeadingProps>(
	({ className, as, size, ...props }, ref) => {
		const Component = as ?? 'h1'
		return (
			<Component
				ref={ref}
				className={cn(headingVariants({ className, size }), className)}
				{...props}
			/>
		)
	},
)
Heading.displayName = 'Heading'
