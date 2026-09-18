import { Command as CommandPrimitive } from 'cmdk'
import { type LucideIcon, Search } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { Dialog, DialogProps } from '../dialog'
import { cn } from '../utils'

export type CommandProps = ComponentPropsWithoutRef<typeof CommandPrimitive>
const Command = React.forwardRef<ElementRef<typeof CommandPrimitive>, CommandProps>(
	({ className, ...props }, ref) => (
		<CommandPrimitive
			ref={ref}
			className={cn(
				'p-1 flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground',
				className,
			)}
			{...props}
		/>
	),
)
Command.displayName = CommandPrimitive.displayName

type CommandDialogProps = DialogProps
const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
	return (
		<Dialog {...props}>
			<Dialog.Content className="p-0 shadow-2xl overflow-hidden">
				<Command className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 **:[[cmdk-group-heading]]:text-muted-foreground">
					{children}
				</Command>
			</Dialog.Content>
		</Dialog>
	)
}

type CommandInputProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
	iconClassName?: string
	wrapperClassName?: string
}
const CommandInput = React.forwardRef<ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
	({ className, iconClassName, wrapperClassName, ...props }, ref) => (
		<div
			className={cn('px-4 flex items-center rounded-md border border-border', wrapperClassName)}
			// eslint-disable-next-line react/no-unknown-property
			cmdk-input-wrapper=""
		>
			<Search
				className={cn('mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50', iconClassName)}
			/>
			<CommandPrimitive.Input
				ref={ref}
				className={cn(
					'h-11 py-3 text-sm flex w-full rounded-md bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				{...props}
			/>
		</div>
	),
)

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
	ElementRef<typeof CommandPrimitive.List>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		ref={ref}
		className={cn('max-h-72 overflow-x-hidden overflow-y-auto', className)}
		{...props}
	/>
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
	ElementRef<typeof CommandPrimitive.Empty>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
	<CommandPrimitive.Empty
		ref={ref}
		className="py-6 text-sm text-center text-muted-foreground"
		{...props}
	/>
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
	ElementRef<typeof CommandPrimitive.Group>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		ref={ref}
		className={cn(
			'p-1 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium overflow-hidden text-foreground **:[[cmdk-group-heading]]:text-muted-foreground',
			className,
		)}
		{...props}
	/>
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
	ElementRef<typeof CommandPrimitive.Separator>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator
		ref={ref}
		className={cn('-mx-1 h-px bg-border/50', className)}
		{...props}
	/>
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
	ElementRef<typeof CommandPrimitive.Item>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		ref={ref}
		className={cn(
			'px-2 py-1.5 text-sm font-medium relative flex cursor-default items-center rounded-sm outline-none select-none aria-selected:bg-muted aria-selected:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
			className,
		)}
		{...props}
	/>
))
CommandItem.displayName = CommandPrimitive.Item.displayName

type CommandIconProps = {
	icon: LucideIcon
} & ComponentPropsWithoutRef<LucideIcon>
const CommandIcon = ({ icon: Icon, className, ...props }: CommandIconProps) => {
	return <Icon className={cn('mr-2 h-4 w-4', className)} {...props} />
}

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn('text-xs tracking-widest ml-auto text-muted-foreground', className)}
			{...props}
		/>
	)
}
CommandShortcut.displayName = 'CommandShortcut'

type CommandSubComponents = {
	Dialog: typeof CommandDialog
	Empty: typeof CommandEmpty
	Group: typeof CommandGroup
	Input: typeof CommandInput
	Item: typeof CommandItem
	List: typeof CommandList
	Separator: typeof CommandSeparator
	Shortcut: typeof CommandShortcut
	Icon: typeof CommandIcon
}

const ExportedCommand = Command as typeof Command & CommandSubComponents

ExportedCommand.Dialog = CommandDialog
ExportedCommand.Empty = CommandEmpty
ExportedCommand.Group = CommandGroup
ExportedCommand.Input = CommandInput
ExportedCommand.Item = CommandItem
ExportedCommand.List = CommandList
ExportedCommand.Separator = CommandSeparator
ExportedCommand.Shortcut = CommandShortcut
ExportedCommand.Icon = CommandIcon

export {
	ExportedCommand as Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandIcon,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
}
