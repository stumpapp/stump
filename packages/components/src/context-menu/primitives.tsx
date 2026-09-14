// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284

import * as ContextMenu from '@radix-ui/react-context-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

const ContextMenuPrimitive = ContextMenu.Root
const ContextMenuPrimitiveTrigger = ContextMenu.Trigger
const ContextMenuPrimitiveGroup = ContextMenu.Group
const ContextMenuPrimitivePortal = ContextMenu.Portal
const ContextMenuPrimitiveSub = ContextMenu.Sub
const ContextMenuPrimitiveRadioGroup = ContextMenu.RadioGroup

const ContextMenuPrimitiveSubTrigger = React.forwardRef<
	ElementRef<typeof ContextMenu.SubTrigger>,
	ComponentPropsWithoutRef<typeof ContextMenu.SubTrigger> & {
		inset?: boolean
	}
>(({ className, inset, children, ...props }, ref) => (
	<ContextMenu.SubTrigger
		ref={ref}
		className={cn(
			'px-2 py-1.5 text-sm font-medium flex cursor-default items-center rounded-sm outline-none select-none focus:bg-accent data-[state=open]:bg-accent',
			inset && 'pl-8',
			className,
		)}
		{...props}
	>
		{children}
		<ChevronRight className="h-4 w-4 ml-auto" />
	</ContextMenu.SubTrigger>
))
ContextMenuPrimitiveSubTrigger.displayName = ContextMenu.SubTrigger.displayName

const ContextMenuPrimitiveSubContent = React.forwardRef<
	ElementRef<typeof ContextMenu.SubContent>,
	ComponentPropsWithoutRef<typeof ContextMenu.SubContent>
>(({ className, ...props }, ref) => (
	<ContextMenu.SubContent
		ref={ref}
		className={cn(
			'min-w-32 p-1 shadow-md z-50 animate-in overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground slide-in-from-left-1',
			className,
		)}
		{...props}
	/>
))
ContextMenuPrimitiveSubContent.displayName = ContextMenu.SubContent.displayName

const ContextMenuPrimitiveContent = React.forwardRef<
	ElementRef<typeof ContextMenu.Content>,
	ComponentPropsWithoutRef<typeof ContextMenu.Content>
>(({ className, ...props }, ref) => (
	<ContextMenu.Portal>
		<ContextMenu.Content
			ref={ref}
			className={cn(
				'min-w-32 p-1 shadow-md z-50 animate-in overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground fade-in-80',
				className,
			)}
			{...props}
		/>
	</ContextMenu.Portal>
))
ContextMenuPrimitiveContent.displayName = ContextMenu.Content.displayName

const ContextMenuPrimitiveItem = React.forwardRef<
	ElementRef<typeof ContextMenu.Item>,
	ComponentPropsWithoutRef<typeof ContextMenu.Item> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<ContextMenu.Item
		ref={ref}
		className={cn(
			'px-2 py-1.5 text-sm font-medium relative flex cursor-default items-center rounded-sm outline-none select-none focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50',
			inset && 'pl-8',
			className,
		)}
		{...props}
	/>
))
ContextMenuPrimitiveItem.displayName = ContextMenu.Item.displayName

const ContextMenuPrimitiveCheckboxItem = React.forwardRef<
	ElementRef<typeof ContextMenu.CheckboxItem>,
	ComponentPropsWithoutRef<typeof ContextMenu.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<ContextMenu.CheckboxItem
		ref={ref}
		className={cn(
			'py-1.5 pr-2 pl-8 text-sm font-medium relative flex cursor-default items-center rounded-sm outline-none select-none focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50',
			className,
		)}
		checked={checked}
		{...props}
	>
		<span className="left-2 h-3.5 w-3.5 absolute flex items-center justify-center">
			<ContextMenu.ItemIndicator>
				<Check className="h-4 w-4" />
			</ContextMenu.ItemIndicator>
		</span>
		{children}
	</ContextMenu.CheckboxItem>
))
ContextMenuPrimitiveCheckboxItem.displayName = ContextMenu.CheckboxItem.displayName

const ContextMenuPrimitiveRadioItem = React.forwardRef<
	ElementRef<typeof ContextMenu.RadioItem>,
	ComponentPropsWithoutRef<typeof ContextMenu.RadioItem>
>(({ className, children, ...props }, ref) => (
	<ContextMenu.RadioItem
		ref={ref}
		className={cn(
			'py-1.5 pr-2 pl-8 text-sm font-medium relative flex cursor-default items-center rounded-sm outline-none select-none focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50',
			className,
		)}
		{...props}
	>
		<span className="left-2 h-3.5 w-3.5 absolute flex items-center justify-center">
			<ContextMenu.ItemIndicator>
				<Circle className="h-2 w-2 fill-current" />
			</ContextMenu.ItemIndicator>
		</span>
		{children}
	</ContextMenu.RadioItem>
))
ContextMenuPrimitiveRadioItem.displayName = ContextMenu.RadioItem.displayName

const ContextMenuPrimitiveLabel = React.forwardRef<
	ElementRef<typeof ContextMenu.Label>,
	ComponentPropsWithoutRef<typeof ContextMenu.Label> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<ContextMenu.Label
		ref={ref}
		className={cn('px-2 py-1.5 text-sm font-semibold text-foreground', inset && 'pl-8', className)}
		{...props}
	/>
))
ContextMenuPrimitiveLabel.displayName = ContextMenu.Label.displayName

const ContextMenuPrimitiveSeparator = React.forwardRef<
	ElementRef<typeof ContextMenu.Separator>,
	ComponentPropsWithoutRef<typeof ContextMenu.Separator>
>(({ className, ...props }, ref) => (
	<ContextMenu.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-border', className)}
		{...props}
	/>
))
ContextMenuPrimitiveSeparator.displayName = ContextMenu.Separator.displayName

const ContextMenuPrimitiveShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn('text-xs tracking-widest ml-auto text-muted-foreground', className)}
			{...props}
		/>
	)
}
ContextMenuPrimitiveShortcut.displayName = 'ContextMenuPrimitiveShortcut'

export {
	ContextMenuPrimitive,
	ContextMenuPrimitiveCheckboxItem,
	ContextMenuPrimitiveContent,
	ContextMenuPrimitiveGroup,
	ContextMenuPrimitiveItem,
	ContextMenuPrimitiveLabel,
	ContextMenuPrimitivePortal,
	ContextMenuPrimitiveRadioGroup,
	ContextMenuPrimitiveRadioItem,
	ContextMenuPrimitiveSeparator,
	ContextMenuPrimitiveShortcut,
	ContextMenuPrimitiveSub,
	ContextMenuPrimitiveSubContent,
	ContextMenuPrimitiveSubTrigger,
	ContextMenuPrimitiveTrigger,
}
