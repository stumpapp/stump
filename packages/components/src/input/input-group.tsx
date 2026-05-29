import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { Button } from '../button'
import { cn } from '../utils'
import { RawInput } from './raw/RawInput'
import { RawTextArea } from './raw/RawTextArea'

function InputGroupRoot({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="input-group"
			role="group"
			className={cn(
				'group/input-group h-9 min-w-0 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5 relative flex w-full items-center rounded-md border border-border bg-input/30 text-foreground transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-md has-data-[align=block-start]:rounded-md has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-field-error-border has-[[data-slot][aria-invalid=true]]:ring-[3px] has-[[data-slot][aria-invalid=true]]:ring-field-error-ring has-[textarea]:rounded-md has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto',
				className,
			)}
			{...props}
		/>
	)
}

const inputGroupAddonVariants = cva(
	"flex h-auto cursor-text items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 **:data-[slot=kbd]:rounded-4xl **:data-[slot=kbd]:bg-muted-foreground/10 **:data-[slot=kbd]:px-1.5 [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				'inline-start': 'order-first pl-3 has-[>button]:-ml-1 has-[>kbd]:ml-[-0.15rem]',
				'inline-end': 'order-last pr-3 has-[>button]:-mr-1 has-[>kbd]:mr-[-0.15rem]',
				'block-start':
					'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-3 [.border-b]:pb-3',
				'block-end':
					'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-3 [.border-t]:pt-3',
			},
		},
		defaultVariants: {
			align: 'inline-start',
		},
	},
)

function InputGroupAddon({
	className,
	align = 'inline-start',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
	return (
		<div
			role="group"
			data-slot="input-group-addon"
			data-align={align}
			className={cn(inputGroupAddonVariants({ align }), className)}
			onClick={(e) => {
				if ((e.target as HTMLElement).closest('button')) {
					return
				}
				e.currentTarget.parentElement?.querySelector('input')?.focus()
			}}
			{...props}
		/>
	)
}

const inputGroupButtonVariants = cva('flex items-center gap-2 rounded-4xl text-sm shadow-none', {
	variants: {
		size: {
			xs: "h-6 gap-1 px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
			sm: '',
			'icon-xs': 'size-6 p-0 has-[>svg]:p-0',
			'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
		},
	},
	defaultVariants: {
		size: 'xs',
	},
})

function InputGroupButton({
	className,
	type = 'button',
	variant = 'ghost',
	size = 'xs',
	...props
}: Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> &
	VariantProps<typeof inputGroupButtonVariants> & {
		type?: 'button' | 'submit' | 'reset'
	}) {
	return (
		<Button
			type={type}
			data-size={size}
			variant={variant}
			className={cn(inputGroupButtonVariants({ size }), className)}
			{...props}
		/>
	)
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn(
				"gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 flex items-center text-muted-foreground [&_svg]:pointer-events-none",
				className,
			)}
			{...props}
		/>
	)
}

function InputGroupInput({ className, ...props }: React.ComponentProps<typeof RawInput>) {
	return (
		<RawInput
			data-slot="input-group-control"
			className={cn(
				'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
				className,
			)}
			{...props}
		/>
	)
}

function InputGroupTextArea({ className, ...props }: React.ComponentProps<typeof RawTextArea>) {
	return (
		<RawTextArea
			data-slot="input-group-control"
			className={cn(
				'py-2 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
				className,
			)}
			{...props}
		/>
	)
}

type InputGroupComponent = typeof InputGroupRoot & {
	Addon: typeof InputGroupAddon
	Button: typeof InputGroupButton
	Text: typeof InputGroupText
	Input: typeof InputGroupInput
	Textarea: typeof InputGroupTextArea
}

export const InputGroup: InputGroupComponent = Object.assign(InputGroupRoot, {
	Addon: InputGroupAddon,
	Button: InputGroupButton,
	Text: InputGroupText,
	Input: InputGroupInput,
	Textarea: InputGroupTextArea,
})
