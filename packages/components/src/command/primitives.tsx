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
				'rounded-lg flex h-full w-full flex-col overflow-hidden bg-background',
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
			<Dialog.Content className="p-0 shadow-2xl **:[[dialog-overlay]]:bg-red-100 overflow-hidden">
				<Command className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 **:[[cmdk-group-heading]]:text-foreground-muted">
					{children}
				</Command>
			</Dialog.Content>
		</Dialog>
	)
}

const CommandInput = React.forwardRef<
	ElementRef<typeof CommandPrimitive.Input>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
	<div
		className="px-4 flex items-center border-b border-b-edge"
		// eslint-disable-next-line react/no-unknown-property
		cmdk-input-wrapper=""
	>
		<Search className="mr-2 h-4 w-4 shrink-0 text-foreground-muted opacity-50" />
		<CommandPrimitive.Input
			ref={ref}
			className={cn(
				'h-11 rounded-md py-3 text-sm flex w-full bg-transparent text-foreground-subtle outline-none placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			{...props}
		/>
	</div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
	ElementRef<typeof CommandPrimitive.List>,
	ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		ref={ref}
		className={cn('max-h-[300px] overflow-x-hidden overflow-y-auto', className)}
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
		className="py-6 text-sm text-center text-foreground-subtle"
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
			'px-2 py-3 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:text-sm **:[[cmdk-group-heading]]:font-semibold overflow-hidden text-foreground-subtle **:[[cmdk-group-heading]]:text-foreground',
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
		className={cn('-mx-1 h-px bg-edge', className)}
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
			'rounded-md px-2 py-1.5 text-sm font-medium relative flex cursor-default items-center outline-none select-none aria-selected:bg-background-surface data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
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
			className={cn('text-xs tracking-widest ml-auto text-foreground-muted', className)}
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
