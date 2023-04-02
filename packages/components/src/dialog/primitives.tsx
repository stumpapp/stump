/* eslint-disable react/prop-types */
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import React from 'react'

import { cn } from '../utils'

export type DialogProps = React.ComponentProps<typeof Dialog>
const Dialog = DialogPrimitive.Root as typeof DialogPrimitive.Root & DialogSubComponents

export type DialogTriggerProps = React.ComponentProps<typeof DialogTrigger>
const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = ({ className, children, ...props }: DialogPrimitive.DialogPortalProps) => (
	<DialogPrimitive.Portal className={cn(className)} {...props}>
		<div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
			{children}
		</div>
	</DialogPrimitive.Portal>
)
DialogPortal.displayName = DialogPrimitive.Portal.displayName

export type DialogOverlayProps = Omit<
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>,
	'children'
>
const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	DialogOverlayProps
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		className={cn(
			'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-100 data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out',
			className,
		)}
		{...props}
		ref={ref}
	/>
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/* eslint-disable sort-keys-fix/sort-keys-fix */
export const DIALOG_CONTENT_SIZES = {
	sm: 'sm:max-w-[425px]',
	md: 'sm:max-w-[600px]',
	lg: 'sm:max-w-2xl',
	xl: 'sm:max-w-3xl',
	massive: 'sm:max-w-7xl',
}
export type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	size?: keyof typeof DIALOG_CONTENT_SIZES
}
const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	DialogContentProps
>(({ className, children, size = 'md', ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				'fixed z-50 grid w-full gap-4 bg-white p-6 animate-in data-[state=open]:fade-in-90 data-[state=open]:slide-in-from-bottom-10 sm:max-w-lg sm:rounded-lg sm:zoom-in-90 data-[state=open]:sm:slide-in-from-bottom-0',
				'dark:bg-gray-900',
				DIALOG_CONTENT_SIZES[size] ?? DIALOG_CONTENT_SIZES.md,
				className,
			)}
			{...props}
		>
			{children}
		</DialogPrimitive.Content>
	</DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0',
			className,
		)}
		{...props}
	/>
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn('text-lg font-semibold text-gray-900', 'dark:text-gray-50', className)}
		{...props}
	/>
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn('text-sm text-gray-500', 'dark:text-gray-400', className)}
		{...props}
	/>
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

const DialogClose = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Close>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Close
		ref={ref}
		className={cn(
			'absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 dark:text-gray-100 dark:focus:ring-brand-400 dark:focus:ring-offset-gray-900 dark:data-[state=open]:bg-gray-800',
			className,
		)}
		{...props}
	>
		<X className="h-4 w-4" />
		<span className="sr-only">Close</span>
	</DialogPrimitive.Close>
))
DialogClose.displayName = DialogPrimitive.Close.displayName

type DialogSubComponents = {
	Content: typeof DialogContent
	Description: typeof DialogDescription
	Footer: typeof DialogFooter
	Header: typeof DialogHeader
	Title: typeof DialogTitle
	Trigger: typeof DialogTrigger
	Close: typeof DialogClose
}

Dialog.Content = DialogContent
Dialog.Description = DialogDescription
Dialog.Footer = DialogFooter
Dialog.Header = DialogHeader
Dialog.Title = DialogTitle
Dialog.Trigger = DialogTrigger
Dialog.Close = DialogClose

export {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
}
