/* eslint-disable react/prop-types */

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import React from 'react'

import { cn } from '../utils'

export type DialogProps = React.ComponentProps<typeof Dialog>
const Dialog = DialogPrimitive.Root as typeof DialogPrimitive.Root & DialogSubComponents

export type DialogTriggerProps = React.ComponentProps<typeof DialogTrigger>
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

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
			'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in',
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
				'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-edge bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full',
				'bg-background',
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
		className={cn('text-lg font-semibold text-foreground', className)}
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
		className={cn('text-sm text-foreground-muted', className)}
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
			'absolute right-4 top-4 rounded-sm text-foreground-subtle opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none data-[state=open]:bg-background',
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
