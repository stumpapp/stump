// yoink <- https://ui.shadcn.com/docs/components/radix/alert-dialog

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import React from 'react'

import { Button, type ButtonProps } from '../button'
import { cn } from '../utils'

function AlertDialogRoot(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
	return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal(props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
	return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	return (
		<AlertDialogPrimitive.Overlay
			data-slot="alert-dialog-overlay"
			className={cn(
				'inset-0 bg-black/50 supports-backdrop-filter:backdrop-blur-xs fixed isolate z-50 duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
				className,
			)}
			{...props}
		/>
	)
}

export const ALERT_DIALOG_CONTENT_SIZES = {
	sm: 'max-w-xs',
	default: 'max-w-[calc(100%-2rem)] sm:max-w-md',
	lg: 'max-w-[calc(100%-2rem)] sm:max-w-xl',
}

export type AlertDialogContentProps = React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
	size?: keyof typeof ALERT_DIALOG_CONTENT_SIZES
}

function AlertDialogContent({ className, size = 'default', ...props }: AlertDialogContentProps) {
	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				data-size={size}
				className={cn(
					'group/alert-dialog-content gap-4 p-4 text-sm fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 rounded-xl bg-dialog text-dialog-foreground ring-1 ring-foreground/10 duration-100 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
					ALERT_DIALOG_CONTENT_SIZES[size] ?? ALERT_DIALOG_CONTENT_SIZES.default,
					className,
				)}
				{...props}
			/>
		</AlertDialogPortal>
	)
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-header"
			className={cn(
				'gap-1.5 has-data-[slot=alert-dialog-media]:gap-x-4 grid grid-rows-[auto_1fr] place-items-center text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr]',
				'sm:group-data-[size=sm]/alert-dialog-content:place-items-center sm:place-items-start sm:text-left sm:group-data-[size=sm]/alert-dialog-content:text-center sm:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr] sm:group-data-[size=sm]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr]',
				className,
			)}
			{...props}
		/>
	)
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-footer"
			className={cn(
				'-mx-4 -mb-4 gap-2 p-4 sm:flex-row sm:justify-end flex flex-col-reverse rounded-b-xl border-t border-border bg-muted/50 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2',
				className,
			)}
			{...props}
		/>
	)
}

// TODO: variant + styling
function AlertDialogMedia({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-dialog-media"
			className={cn(
				"mb-2 size-10 sm:row-span-2 sm:group-data-[size=sm]/alert-dialog-content:row-span-1 *:[svg:not([class*='size-'])]:size-6 inline-flex items-center justify-center rounded-md bg-muted",
				className,
			)}
			{...props}
		/>
	)
}

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return (
		<AlertDialogPrimitive.Title
			data-slot="alert-dialog-title"
			className={cn(
				'text-base font-medium sm:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2 sm:group-data-[size=sm]/alert-dialog-content:col-start-auto text-foreground',
				className,
			)}
			{...props}
		/>
	)
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn(
				'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
				className,
			)}
			{...props}
		/>
	)
}

type AlertDialogButtonProps = Omit<ButtonProps, 'asChild'>

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogButtonProps>(
	({ variant = 'default', ...props }, ref) => (
		<AlertDialogPrimitive.Action asChild>
			<Button ref={ref} data-slot="alert-dialog-action" variant={variant} {...props} />
		</AlertDialogPrimitive.Action>
	),
)
AlertDialogAction.displayName = 'AlertDialogAction'

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogButtonProps>(
	({ variant = 'outline', ...props }, ref) => (
		<AlertDialogPrimitive.Cancel asChild>
			<Button ref={ref} data-slot="alert-dialog-cancel" variant={variant} {...props} />
		</AlertDialogPrimitive.Cancel>
	),
)
AlertDialogCancel.displayName = 'AlertDialogCancel'

const AlertDialog = Object.assign(AlertDialogRoot, {
	Action: AlertDialogAction,
	Cancel: AlertDialogCancel,
	Content: AlertDialogContent,
	Description: AlertDialogDescription,
	Footer: AlertDialogFooter,
	Header: AlertDialogHeader,
	Media: AlertDialogMedia,
	Overlay: AlertDialogOverlay,
	Portal: AlertDialogPortal,
	Title: AlertDialogTitle,
	Trigger: AlertDialogTrigger,
})

export { AlertDialog }
