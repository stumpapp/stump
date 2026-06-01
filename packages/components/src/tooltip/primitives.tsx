import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

const ToolTipProvider = ({
	delayDuration = 0,
	...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => (
	<TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
)
const Tooltip = TooltipPrimitive.Root as typeof TooltipPrimitive.Root & ToolTipSubComponents
const TooltipTrigger = TooltipPrimitive.Trigger

export type ToolTipContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
const TooltipContent = React.forwardRef<
	ElementRef<typeof TooltipPrimitive.Content>,
	ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, children, sideOffset = 4, ...props }, ref) => (
	<TooltipPrimitive.Content
		ref={ref}
		sideOffset={sideOffset}
		className={cn(
			'max-w-xs gap-1.5 px-3 py-1.5 text-xs z-50 inline-flex w-fit origin-(--radix-tooltip-content-transform-origin) animate-in items-center rounded-lg bg-foreground text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
			className,
		)}
		{...props}
	>
		{children}
	</TooltipPrimitive.Content>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

type ToolTipSubComponents = {
	Content: typeof TooltipContent
	Trigger: typeof TooltipTrigger
}

Tooltip.Content = TooltipContent
Tooltip.Trigger = TooltipTrigger

export { TooltipContent, Tooltip as ToolTipPrimitive, ToolTipProvider, TooltipTrigger }
