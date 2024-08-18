/* eslint-disable react/prop-types */
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import React from 'react'

import { cn } from '../utils'

const ToolTipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root as typeof TooltipPrimitive.Root & ToolTipSubComponents
const TooltipTrigger = TooltipPrimitive.Trigger

export type ToolTipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
const TooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<TooltipPrimitive.Content
		ref={ref}
		sideOffset={sideOffset}
		className={cn(
			'z-50 overflow-hidden rounded-md border border-edge-subtle bg-background-surface px-3 py-1.5 text-sm text-foreground-subtle shadow-md animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
			className,
		)}
		{...props}
	/>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

type ToolTipSubComponents = {
	Content: typeof TooltipContent
	Trigger: typeof TooltipTrigger
}

Tooltip.Content = TooltipContent
Tooltip.Trigger = TooltipTrigger

export { TooltipContent, Tooltip as ToolTipPrimitive, ToolTipProvider, TooltipTrigger }
