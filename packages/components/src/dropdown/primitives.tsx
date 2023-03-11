/* eslint-disable react/prop-types */

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import React from 'react'

import { cn } from '../utils'

const DropdownPrimitive = DropdownMenuPrimitive.Root
const DropdownPrimitiveTrigger = DropdownMenuPrimitive.Trigger
const DropdownPrimitiveGroup = DropdownMenuPrimitive.Group
const DropdownPrimitivePortal = DropdownMenuPrimitive.Portal
const DropdownPrimitiveSub = DropdownMenuPrimitive.Sub
const DropdownPrimitiveRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownPrimitiveSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean
	}
>(({ className, inset, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			'flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm font-medium outline-none focus:bg-gray-100 data-[state=open]:bg-gray-100 dark:focus:bg-gray-700 dark:data-[state=open]:bg-gray-700',
			inset && 'pl-8',
			className,
		)}
		{...props}
	>
		{children}
		<ChevronRight className="ml-auto h-4 w-4" />
	</DropdownMenuPrimitive.SubTrigger>
))
DropdownPrimitiveSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownPrimitiveSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			'animate-in slide-in-from-left-1 z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-100 bg-white p-1 text-gray-700 shadow-md dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400',
			className,
		)}
		{...props}
	/>
))
DropdownPrimitiveSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownPrimitiveContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				'animate-in data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-100 bg-white p-1 text-gray-700 shadow-md dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400',
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
))
DropdownPrimitiveContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownPrimitiveItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm font-medium outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-700',
			inset && 'pl-8',
			className,
		)}
		{...props}
	/>
))
DropdownPrimitiveItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownPrimitiveCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<DropdownMenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-700',
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
DropdownPrimitiveCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownPrimitiveRadioItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm font-medium outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-gray-700',
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
DropdownPrimitiveRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownPrimitiveLabel = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn(
			'px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-300',
			inset && 'pl-8',
			className,
		)}
		{...props}
	/>
))
DropdownPrimitiveLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownPrimitiveSeparator = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn('-mx-1 my-1 h-px bg-gray-100 dark:bg-gray-700', className)}
		{...props}
	/>
))
DropdownPrimitiveSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownPrimitiveShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span className={cn('ml-auto text-xs tracking-widest text-gray-500', className)} {...props} />
	)
}
DropdownPrimitiveShortcut.displayName = 'DropdownMenuShortcut'

export {
	DropdownPrimitive,
	DropdownPrimitiveCheckboxItem,
	DropdownPrimitiveContent,
	DropdownPrimitiveGroup,
	DropdownPrimitiveItem,
	DropdownPrimitiveLabel,
	DropdownPrimitivePortal,
	DropdownPrimitiveRadioGroup,
	DropdownPrimitiveRadioItem,
	DropdownPrimitiveSeparator,
	DropdownPrimitiveShortcut,
	DropdownPrimitiveSub,
	DropdownPrimitiveSubContent,
	DropdownPrimitiveSubTrigger,
	DropdownPrimitiveTrigger,
}
