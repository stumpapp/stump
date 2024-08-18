/* eslint-disable react/prop-types */

import React, { forwardRef } from 'react'

import { cn } from '../utils'

type CardBaseProps = React.ComponentPropsWithoutRef<'div'>
export type CardProps = CardBaseProps
export const Card = React.forwardRef<React.ElementRef<'div'>, CardProps>(
	({ className, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn('rounded-md border border-edge text-foreground', className)}
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
					'grid grid-cols-2 items-start justify-center gap-4 sm:grid-cols-4 md:justify-start lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:grid-cols-7 2xl:gap-2 3xl:grid-cols-8 4xl:grid-cols-10',
					className,
				)}
				{...props}
			/>
		)
	},
)
CardGrid.displayName = 'CardGrid'
