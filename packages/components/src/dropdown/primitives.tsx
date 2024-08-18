/* eslint-disable react/prop-types */

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import React from 'react'

import { cn } from '../utils'

const Dropdown = DropdownMenuPrimitive.Root as typeof DropdownMenuPrimitive.Root &
	DropdownSubComponents

const DropdownTrigger = DropdownMenuPrimitive.Trigger
const DropdownGroup = DropdownMenuPrimitive.Group
const DropdownPortal = DropdownMenuPrimitive.Portal
const DropdownSub = DropdownMenuPrimitive.Sub
const DropdownRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean
	}
>(({ className, inset, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm font-medium outline-none focus:bg-background-surface/80 data-[disabled]:cursor-not-allowed data-[state=open]:bg-background-surface',
			inset && 'pl-8',
			className,
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto h-4 w-4" />
	</DropdownMenuPrimitive.SubTrigger>
))
DropdownSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			'z-50 min-w-[8rem] rounded-md border border-edge bg-background p-1 text-foreground-subtle shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
			className,
		)}
		sideOffset={6}
		{...props}
	/>
))
DropdownSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

export type DropdownContentProps = React.ComponentPropsWithoutRef<
	typeof DropdownMenuPrimitive.Content
>
const DropdownContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	DropdownContentProps
>(({ className, sideOffset = 4, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				'z-50 min-w-[8rem] rounded-md border border-edge bg-background p-1 text-foreground-subtle shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
))
DropdownContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm font-medium outline-none focus:bg-background-surface/80 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
			inset && 'pl-8',
			className,
		)}
		{...props}
	/>
))
DropdownItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<DropdownMenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-background-surface/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className,
		)}
		checked={checked}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Check className="h-4 w-4" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.CheckboxItem>
))
DropdownCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownRadioItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-background-surface/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Circle className="h-2 w-2 fill-current" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
))
DropdownRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownLabel = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn('px-2 py-1.5 text-sm font-semibold text-foreground', inset && 'pl-8', className)}
		{...props}
	/>
))
DropdownLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownSeparator = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-edge', className)}
		{...props}
	/>
))
DropdownSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span className={cn('ml-auto text-xs tracking-widest text-gray-500', className)} {...props} />
	)
}
DropdownShortcut.displayName = 'DropdownMenuShortcut'

type DropdownSubComponents = {
	Content: typeof DropdownContent
	Group: typeof DropdownGroup
	Item: typeof DropdownItem
	Label: typeof DropdownLabel
	Portal: typeof DropdownPortal
	CheckboxItem: typeof DropdownCheckboxItem
	RadioGroup: typeof DropdownRadioGroup
	RadioItem: typeof DropdownRadioItem
	Separator: typeof DropdownSeparator
	Shortcut: typeof DropdownShortcut
	Sub: typeof DropdownSub
	SubContent: typeof DropdownSubContent
	SubTrigger: typeof DropdownSubTrigger
	Trigger: typeof DropdownTrigger
}

Dropdown.Content = DropdownContent
Dropdown.Group = DropdownGroup
Dropdown.Item = DropdownItem
Dropdown.Label = DropdownLabel
Dropdown.Portal = DropdownPortal
Dropdown.CheckboxItem = DropdownCheckboxItem
Dropdown.RadioGroup = DropdownRadioGroup
Dropdown.RadioItem = DropdownRadioItem
Dropdown.Separator = DropdownSeparator
Dropdown.Shortcut = DropdownShortcut
Dropdown.Sub = DropdownSub
Dropdown.SubContent = DropdownSubContent
Dropdown.SubTrigger = DropdownSubTrigger
Dropdown.Trigger = DropdownTrigger

export {
	Dropdown,
	DropdownCheckboxItem,
	DropdownContent,
	DropdownGroup,
	DropdownItem,
	DropdownLabel,
	DropdownPortal,
	DropdownRadioGroup,
	DropdownRadioItem,
	DropdownSeparator,
	DropdownShortcut,
	DropdownSub,
	DropdownSubContent,
	DropdownSubTrigger,
	DropdownTrigger,
}
