import * as SelectRadix from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

const SelectPrimitiveRoot = SelectRadix.Root
const SelectPrimitiveGroup = SelectRadix.Group
const SelectPrimitiveValue = SelectRadix.Value

const SelectPrimitiveTrigger = React.forwardRef<
	ElementRef<typeof SelectRadix.Trigger>,
	ComponentPropsWithoutRef<typeof SelectRadix.Trigger>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Trigger
		ref={ref}
		className={cn(
			'h-10 px-3 py-2 text-sm flex w-full items-center justify-between rounded-md border border-border bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none enabled:hover:bg-input/50 disabled:cursor-not-allowed disabled:opacity-50',
			className,
		)}
		{...props}
	>
		{children}
		<ChevronDown className="h-4 w-4 opacity-50" />
	</SelectRadix.Trigger>
))
SelectPrimitiveTrigger.displayName = SelectRadix.Trigger.displayName

const SelectPrimitiveContent = React.forwardRef<
	ElementRef<typeof SelectRadix.Content>,
	ComponentPropsWithoutRef<typeof SelectRadix.Content>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Portal>
		<SelectRadix.Content
			ref={ref}
			className={cn(
				'min-w-32 shadow-md relative z-50 animate-in overflow-hidden rounded-lg border border-border bg-background text-foreground fade-in-80',
				className,
			)}
			{...props}
		>
			<SelectRadix.Viewport className="p-1">{children}</SelectRadix.Viewport>
		</SelectRadix.Content>
	</SelectRadix.Portal>
))
SelectPrimitiveContent.displayName = SelectRadix.Content.displayName

const SelectPrimitiveLabel = React.forwardRef<
	ElementRef<typeof SelectRadix.Label>,
	ComponentPropsWithoutRef<typeof SelectRadix.Label>
>(({ className, ...props }, ref) => (
	<SelectRadix.Label
		ref={ref}
		className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold text-foreground', className)}
		{...props}
	/>
))
SelectPrimitiveLabel.displayName = SelectRadix.Label.displayName

const SelectPrimitiveItem = React.forwardRef<
	ElementRef<typeof SelectRadix.Item>,
	ComponentPropsWithoutRef<typeof SelectRadix.Item>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Item
		ref={ref}
		className={cn(
			'py-1.5 pl-8 pr-2 text-sm font-medium relative flex cursor-default items-center rounded-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
			className,
		)}
		{...props}
	>
		<span className="left-2 h-3.5 w-3.5 absolute flex items-center justify-center">
			<SelectRadix.ItemIndicator>
				<Check className="h-4 w-4" />
			</SelectRadix.ItemIndicator>
		</span>

		<SelectRadix.ItemText>{children}</SelectRadix.ItemText>
	</SelectRadix.Item>
))
SelectPrimitiveItem.displayName = SelectRadix.Item.displayName

const SelectPrimitiveSeparator = React.forwardRef<
	ElementRef<typeof SelectRadix.Separator>,
	ComponentPropsWithoutRef<typeof SelectRadix.Separator>
>(({ className, ...props }, ref) => (
	<SelectRadix.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-border', className)}
		{...props}
	/>
))
SelectPrimitiveSeparator.displayName = SelectRadix.Separator.displayName

export {
	SelectPrimitiveContent,
	SelectPrimitiveGroup,
	SelectPrimitiveItem,
	SelectPrimitiveLabel,
	SelectPrimitiveRoot,
	SelectPrimitiveSeparator,
	SelectPrimitiveTrigger,
	SelectPrimitiveValue,
}
