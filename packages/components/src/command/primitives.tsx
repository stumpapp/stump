/* eslint-disable react/prop-types */
import { Command as CommandPrimitive } from 'cmdk'
import { type LucideIcon, Search } from 'lucide-react'
import React from 'react'

import { Dialog, DialogProps } from '../dialog'
import { cn } from '../utils'

export type CommandProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive>
const Command = React.forwardRef<React.ElementRef<typeof CommandPrimitive>, CommandProps>(
	({ className, ...props }, ref) => (
		<CommandPrimitive
			ref={ref}
			className={cn(
				'flex h-full w-full flex-col overflow-hidden rounded-lg bg-background',
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
			<Dialog.Content className="overflow-hidden p-0 shadow-2xl [&_[dialog-overlay]]:bg-red-100">
				<Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-muted [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
					{children}
				</Command>
			</Dialog.Content>
		</Dialog>
	)
}

const CommandInput = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Input>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
	<div
		className="flex items-center border-b border-b-edge px-4"
		// I promise this exists
		// eslint-disable-next-line react/no-unknown-property
		cmdk-input-wrapper=""
	>
		<Search className="mr-2 h-4 w-4 shrink-0 text-foreground-muted opacity-50" />
		<CommandPrimitive.Input
			ref={ref}
			className={cn(
				'flex h-11 w-full rounded-md bg-transparent py-3 text-sm text-foreground-subtle outline-none placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			{...props}
		/>
	</div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		ref={ref}
		className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
		{...props}
	/>
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Empty>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
	<CommandPrimitive.Empty
		ref={ref}
		className="py-6 text-center text-sm text-foreground-subtle"
		{...props}
	/>
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Group>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		ref={ref}
		className={cn(
			'overflow-hidden px-2 py-3 text-foreground-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-foreground',
			className,
		)}
		{...props}
	/>
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator
		ref={ref}
		className={cn('-mx-1 h-px bg-edge', className)}
		{...props}
	/>
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm font-medium outline-none aria-selected:bg-background-surface data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className,
		)}
		{...props}
	/>
))
CommandItem.displayName = CommandPrimitive.Item.displayName

type CommandIconProps = {
	icon: LucideIcon
} & React.ComponentPropsWithoutRef<LucideIcon>
const CommandIcon = ({ icon: Icon, className, ...props }: CommandIconProps) => {
	return <Icon className={cn('mr-2 h-4 w-4', className)} {...props} />
}

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn('ml-auto text-xs tracking-widest text-foreground-muted', className)}
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
