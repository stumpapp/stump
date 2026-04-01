import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

export type DialogProps = React.ComponentProps<typeof Dialog>
const Dialog = DialogPrimitive.Root as typeof DialogPrimitive.Root & DialogSubComponents

export type DialogTriggerProps = React.ComponentProps<typeof DialogTrigger>
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

export type DialogOverlayProps = Omit<
	ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>,
	'children'
>
const DialogOverlay = React.forwardRef<
	ElementRef<typeof DialogPrimitive.Overlay>,
	DialogOverlayProps
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		className={cn(
			'inset-0 bg-black/50 backdrop-blur-sm fixed z-50 duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
			className,
		)}
		{...props}
		ref={ref}
	/>
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export const DIALOG_CONTENT_SIZES = {
	sm: 'sm:max-w-[425px]',
	// TODO: md is pretty large
	md: 'sm:max-w-[600px]',
	lg: 'sm:max-w-2xl',
	xl: 'sm:max-w-3xl',
	massive: 'sm:max-w-7xl',
}
export type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	size?: keyof typeof DIALOG_CONTENT_SIZES
}
const DialogContent = React.forwardRef<
	ElementRef<typeof DialogPrimitive.Content>,
	DialogContentProps
>(({ className, children, size = 'md', ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				'max-w-lg gap-4 p-4 shadow-lg sm:rounded-lg md:w-full fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] border border-edge bg-background-overlay duration-100 outline-none! data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
				'bg-background',
				DIALOG_CONTENT_SIZES[size] ?? DIALOG_CONTENT_SIZES.md,
				className,
			)}
			{...props}
			onCloseAutoFocus={(event) => {
				event.preventDefault()
				document.body.style.pointerEvents = ''
			}}
		>
			{children}
		</DialogPrimitive.Content>
	</DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('space-y-1 sm:text-left flex flex-col text-center', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'space-y-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 flex flex-col-reverse space-y-reverse',
			className,
		)}
		{...props}
	/>
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
	ElementRef<typeof DialogPrimitive.Title>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn('text-lg font-semibold text-foreground', className)}
		{...props}
	/>
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
	ElementRef<typeof DialogPrimitive.Description>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn('text-sm text-foreground-muted', className)}
		{...props}
	/>
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

const DialogClose = React.forwardRef<
	ElementRef<typeof DialogPrimitive.Close>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Close
		ref={ref}
		className={cn(
			'right-4 top-4 rounded-sm absolute text-foreground-subtle opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-edge-brand focus:ring-offset-2 focus:ring-offset-background focus:outline-none disabled:pointer-events-none data-[state=open]:bg-background',
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
