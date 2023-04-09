/* eslint-disable react/prop-types */
// Card
// CardContent
// CardOverlay

import React, { forwardRef } from 'react'

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

export const CardGrid = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
	({ className, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					'4xl:grid-cols-8 grid grid-cols-2 items-start justify-center gap-4 sm:grid-cols-3 md:justify-start lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:grid-cols-7 2xl:gap-2',
					className,
				)}
				{...props}
			/>
		)
	},
)
CardGrid.displayName = 'CardGrid'
