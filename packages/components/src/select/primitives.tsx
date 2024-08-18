/* eslint-disable react/prop-types */
import * as SelectRadix from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import React from 'react'

import { cn } from '../utils'

const SelectPrimitiveRoot = SelectRadix.Root
const SelectPrimitiveGroup = SelectRadix.Group
const SelectPrimitiveValue = SelectRadix.Value

const SelectPrimitiveTrigger = React.forwardRef<
	React.ElementRef<typeof SelectRadix.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectRadix.Trigger>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Trigger
		ref={ref}
		className={cn(
			'focus:ring-background-400 flex h-10 w-full items-center justify-between rounded-md border border-edge bg-transparent px-3 py-2 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
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
	React.ElementRef<typeof SelectRadix.Content>,
	React.ComponentPropsWithoutRef<typeof SelectRadix.Content>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Portal>
		<SelectRadix.Content
			ref={ref}
			className={cn(
				'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-edge bg-background text-foreground-subtle shadow-md animate-in fade-in-80',
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
	React.ElementRef<typeof SelectRadix.Label>,
	React.ComponentPropsWithoutRef<typeof SelectRadix.Label>
>(({ className, ...props }, ref) => (
	<SelectRadix.Label
		ref={ref}
		className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold text-foreground', className)}
		{...props}
	/>
))
SelectPrimitiveLabel.displayName = SelectRadix.Label.displayName

const SelectPrimitiveItem = React.forwardRef<
	React.ElementRef<typeof SelectRadix.Item>,
	React.ComponentPropsWithoutRef<typeof SelectRadix.Item>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-background-surface data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<SelectRadix.ItemIndicator>
				<Check className="h-4 w-4" />
			</SelectRadix.ItemIndicator>
		</span>

		<SelectRadix.ItemText>{children}</SelectRadix.ItemText>
	</SelectRadix.Item>
))
SelectPrimitiveItem.displayName = SelectRadix.Item.displayName

const SelectPrimitiveSeparator = React.forwardRef<
	React.ElementRef<typeof SelectRadix.Separator>,
	React.ComponentPropsWithoutRef<typeof SelectRadix.Separator>
>(({ className, ...props }, ref) => (
	<SelectRadix.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-edge', className)}
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
