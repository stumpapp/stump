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
			'inset-0 supports-backdrop-filter:backdrop-blur-xs bg-black/50 fixed isolate z-50 duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
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
	gargantuan: 'sm:max-w-[90%] sm:min-h-[90%]', // lol
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
				'gap-6 p-6 text-sm fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-dialog text-dialog-foreground ring-1 ring-foreground/5 duration-100 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
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
	<div className={cn('gap-2 flex flex-col', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('gap-2 sm:flex-row sm:justify-end flex flex-col-reverse', className)}
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
		className={cn('text-base font-medium leading-none text-foreground', className)}
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
		className={cn('text-sm text-muted-foreground', className)}
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
			'right-4 top-4 size-8 absolute inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none',
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
