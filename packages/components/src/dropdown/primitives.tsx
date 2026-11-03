import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cva, VariantProps } from 'class-variance-authority'
import { Check, ChevronRight } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '../utils'

const contentVariants = cva(
	'z-50 p-1 origin-(--radix-dropdown-menu-content-transform-origin) rounded-lg border border-border bg-popover text-popover-foreground duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
	{
		defaultVariants: { kind: 'content' },
		variants: {
			kind: {
				content:
					'min-w-32 shadow-md max-h-(--radix-dropdown-menu-content-available-height) overflow-x-hidden overflow-y-auto data-[state=closed]:overflow-hidden',
				sub: 'min-w-24 shadow-lg overflow-hidden',
			},
		},
	},
)

const itemVariants = cva(
	"gap-1.5 px-1.5 py-1 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center rounded-md outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		defaultVariants: { variant: 'default', isActive: false },
		variants: {
			variant: {
				default: 'focus:bg-accent focus:text-accent-foreground',
				destructive:
					'text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20 *:[svg]:text-destructive',
			},
			isActive: { true: '', false: '' },
		},
		compoundVariants: [
			{ variant: 'default', isActive: true, className: 'bg-accent text-accent-foreground' },
			{ variant: 'destructive', isActive: true, className: 'bg-destructive/10 text-destructive' },
		],
	},
)

const indicatorItemClasses =
	"gap-1.5 py-1 pr-8 pl-1.5 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center rounded-md outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"

type ItemVariantProps = Pick<VariantProps<typeof itemVariants>, 'variant'>

function DropdownRoot(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
	return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownTrigger(props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
	return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownGroup(props: ComponentProps<typeof DropdownMenuPrimitive.Group>) {
	return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownPortal(props: ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
	return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownSub(props: ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
	return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownRadioGroup(props: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
	return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownSubTrigger({
	className,
	inset,
	variant = 'default',
	children,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> &
	ItemVariantProps & {
		inset?: boolean
	}) {
	return (
		<DropdownMenuPrimitive.SubTrigger
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				itemVariants({ variant }),
				variant === 'destructive'
					? 'data-[state=open]:bg-destructive/10 data-[state=open]:text-destructive'
					: 'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
				className,
			)}
			{...props}
		>
			{children}
			<ChevronRight className="ml-auto" />
		</DropdownMenuPrimitive.SubTrigger>
	)
}

function DropdownSubContent({
	className,
	sideOffset = 6,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
	return (
		<DropdownMenuPrimitive.SubContent
			data-slot="dropdown-menu-sub-content"
			sideOffset={sideOffset}
			className={cn(contentVariants({ kind: 'sub' }), className)}
			{...props}
		/>
	)
}

export type DropdownContentProps = ComponentProps<typeof DropdownMenuPrimitive.Content>

function DropdownContent({ className, sideOffset = 4, ...props }: DropdownContentProps) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				className={cn(contentVariants({ kind: 'content' }), className)}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	)
}

function DropdownItem({
	className,
	inset,
	variant = 'default',
	isActive,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> &
	ItemVariantProps & {
		inset?: boolean
		isActive?: boolean
	}) {
	return (
		<DropdownMenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			data-active={isActive || undefined}
			className={cn(
				'group/dropdown-menu-item',
				itemVariants({ variant, isActive: !!isActive }),
				className,
			)}
			{...props}
		/>
	)
}

function DropdownCheckboxItem({
	className,
	children,
	checked,
	inset,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & { inset?: boolean }) {
	return (
		<DropdownMenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			data-inset={inset}
			className={cn(indicatorItemClasses, className)}
			checked={checked}
			{...props}
		>
			<span
				data-slot="dropdown-menu-checkbox-item-indicator"
				className="right-2 pointer-events-none absolute flex items-center justify-center"
			>
				<DropdownMenuPrimitive.ItemIndicator>
					<Check />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.CheckboxItem>
	)
}

function DropdownRadioItem({
	className,
	children,
	inset,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & { inset?: boolean }) {
	return (
		<DropdownMenuPrimitive.RadioItem
			data-slot="dropdown-menu-radio-item"
			data-inset={inset}
			className={cn(indicatorItemClasses, className)}
			{...props}
		>
			<span
				data-slot="dropdown-menu-radio-item-indicator"
				className="right-2 pointer-events-none absolute flex items-center justify-center"
			>
				<DropdownMenuPrimitive.ItemIndicator>
					<Check />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.RadioItem>
	)
}

function DropdownLabel({
	className,
	inset,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
	return (
		<DropdownMenuPrimitive.Label
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				'px-1.5 py-1 text-xs font-medium data-inset:pl-7 text-muted-foreground',
				className,
			)}
			{...props}
		/>
	)
}

function DropdownSeparator({
	className,
	...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
	return (
		<DropdownMenuPrimitive.Separator
			data-slot="dropdown-menu-separator"
			className={cn('-mx-1 my-1 h-px bg-border', className)}
			{...props}
		/>
	)
}

function DropdownShortcut({ className, ...props }: ComponentProps<'span'>) {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cn(
				'text-xs tracking-widest ml-auto text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground',
				className,
			)}
			{...props}
		/>
	)
}

const Dropdown = Object.assign(DropdownRoot, {
	CheckboxItem: DropdownCheckboxItem,
	Content: DropdownContent,
	Group: DropdownGroup,
	Item: DropdownItem,
	Label: DropdownLabel,
	Portal: DropdownPortal,
	RadioGroup: DropdownRadioGroup,
	RadioItem: DropdownRadioItem,
	Separator: DropdownSeparator,
	Shortcut: DropdownShortcut,
	Sub: DropdownSub,
	SubContent: DropdownSubContent,
	SubTrigger: DropdownSubTrigger,
	Trigger: DropdownTrigger,
})

export {
	Dropdown,
	DropdownCheckboxItem,
	DropdownContent,
	DropdownGroup,
	DropdownItem,
	itemVariants as dropdownItemVariants,
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
