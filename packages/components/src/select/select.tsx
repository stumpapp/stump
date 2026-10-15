import * as SelectRadix from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ComponentPropsWithoutRef, ComponentRef } from 'react'
import React from 'react'

import { cn } from '../utils'

const SelectRoot = SelectRadix.Root
const SelectValue = SelectRadix.Value

const SELECT_TRIGGER_SIZES = {
	default: 'h-9',
	sm: 'h-8',
}

type SelectTriggerProps = ComponentPropsWithoutRef<typeof SelectRadix.Trigger> & {
	size?: keyof typeof SELECT_TRIGGER_SIZES
}

const SelectTrigger = React.forwardRef<
	ComponentRef<typeof SelectRadix.Trigger>,
	SelectTriggerProps
>(({ className, children, size = 'default', ...props }, ref) => (
	<SelectRadix.Trigger
		ref={ref}
		className={cn(
			'gap-1.5 py-2 pr-2 pl-3 text-sm flex w-full items-center justify-between rounded-interactive border border-border bg-input/30 whitespace-nowrap text-foreground transition-colors outline-none select-none',
			'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 enabled:hover:bg-input/50',
			'disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground',
			'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
			'[&_svg]:pointer-events-none [&_svg]:shrink-0 [&>span]:line-clamp-1',
			SELECT_TRIGGER_SIZES[size],
			className,
		)}
		{...props}
	>
		{children}
		<SelectRadix.Icon asChild>
			<ChevronDown className="size-4 text-muted-foreground" />
		</SelectRadix.Icon>
	</SelectRadix.Trigger>
))
SelectTrigger.displayName = SelectRadix.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
	ComponentRef<typeof SelectRadix.ScrollUpButton>,
	ComponentPropsWithoutRef<typeof SelectRadix.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectRadix.ScrollUpButton
		ref={ref}
		className={cn('py-1 flex cursor-default items-center justify-center', className)}
		{...props}
	>
		<ChevronUp className="size-4" />
	</SelectRadix.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectRadix.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
	ComponentRef<typeof SelectRadix.ScrollDownButton>,
	ComponentPropsWithoutRef<typeof SelectRadix.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectRadix.ScrollDownButton
		ref={ref}
		className={cn('py-1 flex cursor-default items-center justify-center', className)}
		{...props}
	>
		<ChevronDown className="size-4" />
	</SelectRadix.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectRadix.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
	ComponentRef<typeof SelectRadix.Content>,
	ComponentPropsWithoutRef<typeof SelectRadix.Content>
>(({ className, children, position = 'popper', sideOffset = 4, ...props }, ref) => (
	<SelectRadix.Portal>
		<SelectRadix.Content
			ref={ref}
			position={position}
			sideOffset={sideOffset}
			className={cn(
				'min-w-32 shadow-md relative z-50 max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground',
				'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
				'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				className,
			)}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectRadix.Viewport
				className={cn(
					'p-1',
					// grow to at least the trigger's width
					position === 'popper' &&
						'h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)',
				)}
			>
				{children}
			</SelectRadix.Viewport>
			<SelectScrollDownButton />
		</SelectRadix.Content>
	</SelectRadix.Portal>
))
SelectContent.displayName = SelectRadix.Content.displayName

const SelectGroup = React.forwardRef<
	ComponentRef<typeof SelectRadix.Group>,
	ComponentPropsWithoutRef<typeof SelectRadix.Group>
>(({ className, ...props }, ref) => (
	<SelectRadix.Group ref={ref} className={cn('scroll-my-1', className)} {...props} />
))
SelectGroup.displayName = SelectRadix.Group.displayName

const SelectLabel = React.forwardRef<
	ComponentRef<typeof SelectRadix.Label>,
	ComponentPropsWithoutRef<typeof SelectRadix.Label>
>(({ className, ...props }, ref) => (
	<SelectRadix.Label
		ref={ref}
		className={cn('px-2 py-1 text-xs font-medium text-muted-foreground', className)}
		{...props}
	/>
))
SelectLabel.displayName = SelectRadix.Label.displayName

const SelectItem = React.forwardRef<
	ComponentRef<typeof SelectRadix.Item>,
	ComponentPropsWithoutRef<typeof SelectRadix.Item>
>(({ className, children, ...props }, ref) => (
	<SelectRadix.Item
		ref={ref}
		className={cn(
			'py-1.5 pr-8 pl-2 text-sm relative flex w-full cursor-default items-center rounded-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
			className,
		)}
		{...props}
	>
		<span className="right-2 size-4 pointer-events-none absolute flex items-center justify-center">
			<SelectRadix.ItemIndicator>
				<Check className="size-4" />
			</SelectRadix.ItemIndicator>
		</span>
		<SelectRadix.ItemText>{children}</SelectRadix.ItemText>
	</SelectRadix.Item>
))
SelectItem.displayName = SelectRadix.Item.displayName

const SelectSeparator = React.forwardRef<
	ComponentRef<typeof SelectRadix.Separator>,
	ComponentPropsWithoutRef<typeof SelectRadix.Separator>
>(({ className, ...props }, ref) => (
	<SelectRadix.Separator
		ref={ref}
		className={cn('-mx-1 my-1 pointer-events-none h-px bg-border', className)}
		{...props}
	/>
))
SelectSeparator.displayName = SelectRadix.Separator.displayName

type SelectComponent = typeof SelectRoot & {
	Trigger: typeof SelectTrigger
	Value: typeof SelectValue
	Content: typeof SelectContent
	Group: typeof SelectGroup
	Label: typeof SelectLabel
	Item: typeof SelectItem
	Separator: typeof SelectSeparator
}

export const Select = Object.assign(SelectRoot, {
	Trigger: SelectTrigger,
	Value: SelectValue,
	Content: SelectContent,
	Group: SelectGroup,
	Label: SelectLabel,
	Item: SelectItem,
	Separator: SelectSeparator,
}) as SelectComponent
