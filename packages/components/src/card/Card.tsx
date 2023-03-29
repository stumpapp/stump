/* eslint-disable react/prop-types */
// Card
// CardContent
// CardOverlay

import React from 'react'

import { cn } from '../utils'

// TODO: div OR link
type CardBaseProps = React.ComponentPropsWithoutRef<'div'>
export type CardProps = /*VariantProps<typeof cardVariants> &*/ CardBaseProps
export const Card = React.forwardRef<React.ElementRef<'div'>, CardProps>(
	({ className, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn('rounded-md border border-gray-75 dark:border-gray-800', className)}
				{...props}
			/>
		)
	},
)
Card.displayName = 'Card'
