/* eslint-disable react/prop-types */
// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284

import * as ContextMenu from '@radix-ui/react-context-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import React from 'react'

import { cn } from '../utils'

const ContextMenuPrimitive = ContextMenu.Root
const ContextMenuPrimitiveTrigger = ContextMenu.Trigger
const ContextMenuPrimitiveGroup = ContextMenu.Group
const ContextMenuPrimitivePortal = ContextMenu.Portal
const ContextMenuPrimitiveSub = ContextMenu.Sub
const ContextMenuPrimitiveRadioGroup = ContextMenu.RadioGroup

const ContextMenuPrimitiveSubTrigger = React.forwardRef<
	React.ElementRef<typeof ContextMenu.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.SubTrigger> & {
		inset?: boolean
	}
>(({ className, inset, children, ...props }, ref) => (
	<ContextMenu.SubTrigger
		ref={ref}
		className={cn(
			'flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm font-medium outline-none focus:bg-gray-75 data-[state=open]:bg-gray-75 dark:focus:bg-gray-700 dark:data-[state=open]:bg-gray-700',
			inset && 'pl-8',
			className,
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto h-4 w-4" />
	</ContextMenu.SubTrigger>
))
ContextMenuPrimitiveSubTrigger.displayName = ContextMenu.SubTrigger.displayName

const ContextMenuPrimitiveSubContent = React.forwardRef<
	React.ElementRef<typeof ContextMenu.SubContent>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.SubContent>
>(({ className, ...props }, ref) => (
	<ContextMenu.SubContent
		ref={ref}
		className={cn(
			'z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-100 bg-white p-1 shadow-md animate-in slide-in-from-left-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-150',
			className,
		)}
		{...props}
	/>
))
ContextMenuPrimitiveSubContent.displayName = ContextMenu.SubContent.displayName

const ContextMenuPrimitiveContent = React.forwardRef<
	React.ElementRef<typeof ContextMenu.Content>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.Content>
>(({ className, ...props }, ref) => (
	<ContextMenu.Portal>
		<ContextMenu.Content
			ref={ref}
			className={cn(
				'z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-100 bg-white p-1 text-gray-800 shadow-md animate-in fade-in-80 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-150',
				className,
			)}
			{...props}
		/>
	</ContextMenu.Portal>
))
ContextMenuPrimitiveContent.displayName = ContextMenu.Content.displayName

const ContextMenuPrimitiveItem = React.forwardRef<
	React.ElementRef<typeof ContextMenu.Item>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.Item> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<ContextMenu.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm font-medium outline-none focus:bg-gray-75 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-700',
			inset && 'pl-8',
			className,
		)}
		{...props}
	/>
))
ContextMenuPrimitiveItem.displayName = ContextMenu.Item.displayName

const ContextMenuPrimitiveCheckboxItem = React.forwardRef<
	React.ElementRef<typeof ContextMenu.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<ContextMenu.CheckboxItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-gray-75 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-700',
			className,
		)}
		checked={checked}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<ContextMenu.ItemIndicator>
				<Check className="h-4 w-4" />
			</ContextMenu.ItemIndicator>
		</span>
		{children}
	</ContextMenu.CheckboxItem>
))
ContextMenuPrimitiveCheckboxItem.displayName = ContextMenu.CheckboxItem.displayName

const ContextMenuPrimitiveRadioItem = React.forwardRef<
	React.ElementRef<typeof ContextMenu.RadioItem>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.RadioItem>
>(({ className, children, ...props }, ref) => (
	<ContextMenu.RadioItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-gray-75 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-700',
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<ContextMenu.ItemIndicator>
				<Circle className="h-2 w-2 fill-current" />
			</ContextMenu.ItemIndicator>
		</span>
		{children}
	</ContextMenu.RadioItem>
))
ContextMenuPrimitiveRadioItem.displayName = ContextMenu.RadioItem.displayName

const ContextMenuPrimitiveLabel = React.forwardRef<
	React.ElementRef<typeof ContextMenu.Label>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.Label> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<ContextMenu.Label
		ref={ref}
		className={cn(
			'px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100',
			inset && 'pl-8',
			className,
		)}
		{...props}
	/>
))
ContextMenuPrimitiveLabel.displayName = ContextMenu.Label.displayName

const ContextMenuPrimitiveSeparator = React.forwardRef<
	React.ElementRef<typeof ContextMenu.Separator>,
	React.ComponentPropsWithoutRef<typeof ContextMenu.Separator>
>(({ className, ...props }, ref) => (
	<ContextMenu.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-gray-75 dark:bg-gray-700', className)}
		{...props}
	/>
))
ContextMenuPrimitiveSeparator.displayName = ContextMenu.Separator.displayName

const ContextMenuPrimitiveShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span className={cn('ml-auto text-xs tracking-widest text-gray-600', className)} {...props} />
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
