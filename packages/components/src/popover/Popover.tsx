import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

const Popover = PopoverPrimitive.Root as typeof PopoverPrimitive.Root & PopoverSubComponents
const PopoverTrigger = PopoverPrimitive.Trigger

const POPOVER_SIZE_VARIANTS = {
	default: 'w-64',
	lg: 'w-80',
	md: 'w-64',
	sm: 'w-48',
}

type PopoverContentProps = {
	size?: keyof typeof POPOVER_SIZE_VARIANTS
} & ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
const PopoverContent = React.forwardRef<
	ElementRef<typeof PopoverPrimitive.Content>,
	PopoverContentProps
>(({ className, align = 'center', sideOffset = 4, size, ...props }, ref) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			ref={ref}
			align={align}
			sideOffset={sideOffset}
			className={cn(
				'z-50 rounded-md border border-edge bg-background p-4 shadow-md outline-none animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				POPOVER_SIZE_VARIANTS[size || 'default'] ?? POPOVER_SIZE_VARIANTS.default,
				className,
			)}
			{...props}
		/>
	</PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

type PopoverSubComponents = {
	Content: typeof PopoverContent
	Trigger: typeof PopoverTrigger
}

Popover.Content = PopoverContent
Popover.Trigger = PopoverTrigger

export { Popover, PopoverContent, PopoverTrigger }
