import * as HoverCardRadix from '@radix-ui/react-hover-card'
import React from 'react'

import { cn } from '../utils'

const HoverCardPrimitive = HoverCardRadix.Root
const HoverCardPrimitiveTrigger = HoverCardRadix.Trigger
const HoverCardPrimitiveContent = HoverCardRadix.Content

export type HoverCardProps = {
	trigger: React.ReactNode
	children: React.ReactNode
	contentClassName?: string
} & React.ComponentPropsWithoutRef<typeof HoverCardPrimitive>

export type HoverCardContentProps = React.ComponentPropsWithoutRef<
	typeof HoverCardPrimitiveContent
> & {
	className?: string
	align?: 'start' | 'center' | 'end'
	sideOffset?: number
}
const HoverCardContent = React.forwardRef<
	React.ElementRef<typeof HoverCardPrimitiveContent>,
	HoverCardContentProps
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
	<HoverCardPrimitiveContent
		ref={ref}
		align={align}
		sideOffset={sideOffset}
		className={cn(
			'z-50 w-64 rounded-md border border-gray-100 bg-white p-4 shadow-md outline-none animate-in zoom-in-90 dark:border-gray-800 dark:bg-gray-850',
			className,
		)}
		{...props}
	/>
))
HoverCardContent.displayName = 'HoverCardContent'

export function HoverCard({ trigger, children, contentClassName }: HoverCardProps) {
	return (
		<HoverCardPrimitive>
			<HoverCardPrimitiveTrigger asChild>{trigger}</HoverCardPrimitiveTrigger>
			<HoverCardContent className={contentClassName}>{children}</HoverCardContent>
		</HoverCardPrimitive>
	)
}
