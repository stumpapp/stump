import * as HoverCardRadix from '@radix-ui/react-hover-card'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

const HoverCardPrimitive = HoverCardRadix.Root
const HoverCardPrimitiveTrigger = HoverCardRadix.Trigger
const HoverCardPrimitiveContent = HoverCardRadix.Content

export type HoverCardProps = {
	trigger: React.ReactNode
	children: React.ReactNode
	contentClassName?: string
} & ComponentPropsWithoutRef<typeof HoverCardPrimitive> &
	Pick<HoverCardContentProps, 'align' | 'sideOffset' | 'side'>

export type HoverCardContentProps = ComponentPropsWithoutRef<typeof HoverCardPrimitiveContent>
const HoverCardContent = React.forwardRef<
	ElementRef<typeof HoverCardPrimitiveContent>,
	HoverCardContentProps
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
	<HoverCardPrimitiveContent
		ref={ref}
		align={align}
		sideOffset={sideOffset}
		className={cn(
			'z-50 w-64 rounded-md border border-edge bg-background-overlay p-4 shadow-md outline-none animate-in zoom-in-90',
			className,
		)}
		{...props}
	/>
))
HoverCardContent.displayName = 'HoverCardContent'

export function HoverCard({
	trigger,
	children,
	contentClassName,
	sideOffset,
	align,
	side,
}: HoverCardProps) {
	return (
		<HoverCardPrimitive>
			<HoverCardPrimitiveTrigger asChild>{trigger}</HoverCardPrimitiveTrigger>
			<HoverCardContent
				className={contentClassName}
				sideOffset={sideOffset}
				align={align}
				side={side}
			>
				{children}
			</HoverCardContent>
		</HoverCardPrimitive>
	)
}
