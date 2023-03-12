import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type As = `h${HeadingLevel}`

export const HEADING_BASE_CLASSES = ''

const headingVariants = cva('', {
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
		},
	},
})

type BaseProps = VariantProps<typeof headingVariants> & React.ComponentPropsWithoutRef<As>
export type HeadingProps = {
	as?: As
	className?: string
} & BaseProps

export const Heading = React.forwardRef<React.ElementRef<As>, HeadingProps>(
	({ className, as, size, ...props }, ref) => {
		const Component = as ?? 'h1'
		return <Component ref={ref} className={cn(headingVariants({ className, size }))} {...props} />
	},
)
Heading.displayName = 'Heading'
