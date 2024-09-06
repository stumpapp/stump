/* eslint-disable react/prop-types */
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import React, { ComponentProps } from 'react'

import { cn } from '../utils'

const Sheet = (props: ComponentProps<typeof SheetPrimitive.Root>) => (
	<SheetPrimitive.Root {...props} />
)
const SheetTrigger = (props: ComponentProps<typeof SheetPrimitive.Trigger>) => (
	<SheetPrimitive.Trigger {...props} />
)
const SheetPortal = SheetPrimitive.Portal

export type SheetOverlayProps = Omit<
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>,
	'children'
>
const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	SheetOverlayProps
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Overlay
		className={cn(
			'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			className,
		)}
		{...props}
		ref={ref}
	/>
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
	'fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300 flex flex-col',
	{
		compoundVariants: [
			{
				class: 'max-h-screen',
				position: ['top', 'bottom'],
				size: 'content',
			},
			{
				class: 'h-1/3',
				position: ['top', 'bottom'],
				size: 'default',
			},
			{
				class: 'h-1/4',
				position: ['top', 'bottom'],
				size: 'sm',
			},
			{
				class: 'h-1/2',
				position: ['top', 'bottom'],
				size: 'lg',
			},
			{
				class: 'h-5/6',
				position: ['top', 'bottom'],
				size: 'xl',
			},
			{
				class: 'h-screen',
				position: ['top', 'bottom'],
				size: 'full',
			},
			{
				class: 'max-w-screen',
				position: ['right', 'left'],
				size: 'content',
			},
			{
				class: 'w-1/3',
				position: ['right', 'left'],
				size: 'default',
			},
			{
				class: 'w-1/4',
				position: ['right', 'left'],
				size: 'sm',
			},
			{
				class: 'w-1/2',
				position: ['right', 'left'],
				size: 'lg',
			},
			{
				class: 'w-5/6',
				position: ['right', 'left'],
				size: 'xl',
			},
			{
				class: 'w-screen',
				position: ['right', 'left'],
				size: 'full',
			},
		],
		defaultVariants: {
			position: 'right',
			size: 'default',
		},
		variants: {
			position: {
				bottom:
					'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom border-edge-subtle/80',
				left: 'inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left border-edge-subtle/80',
				right:
					'inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right border-edge-subtle/80',
				top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top border-edge-subtle/80',
			},
			size: {
				content: '',
				default: '',
				full: '',
				lg: '',
				sm: '',
				xl: '',
			},
		},
	},
)

export type SheetContentProps = {
	closeIcon?: boolean
	rounded?: boolean
} & React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
	VariantProps<typeof sheetVariants>

const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	SheetContentProps
>(({ position, size, className, children, closeIcon, rounded, ...props }, ref) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Content
			ref={ref}
			className={cn(sheetVariants({ position, size }), rounded && 'rounded-md', className)}
			{...props}
		>
			{children}
			{closeIcon && (
				<SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none data-[state=open]:bg-background">
					<X className="h-4 w-4 text-foreground-subtle" />
					<span className="sr-only">Close</span>
				</SheetPrimitive.Close>
			)}
		</SheetPrimitive.Content>
	</SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('flex flex-col space-y-2 pb-2 pt-4 text-center sm:text-left', className)}
		{...props}
	/>
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('flex flex-col-reverse px-6 sm:flex-row sm:justify-end sm:space-x-2', className)}
		{...props}
	/>
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Title
		ref={ref}
		className={cn('text-lg font-semibold text-foreground', 'px-6', className)}
		{...props}
	/>
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Description
		ref={ref}
		className={cn('px-6 text-sm text-foreground-muted', className)}
		{...props}
	/>
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

type SheetSubComponents = {
	Header: typeof SheetHeader
	Title: typeof SheetTitle
	Content: typeof SheetContent
	Footer: typeof SheetFooter
	Trigger: typeof SheetTrigger
	Portal: typeof SheetPortal
	Overlay: typeof SheetOverlay
	Description: typeof SheetDescription
	Close: typeof SheetPrimitive.Close
}
const TypedSheet = Sheet as typeof Sheet & SheetSubComponents
TypedSheet.Header = SheetHeader
TypedSheet.Title = SheetTitle
TypedSheet.Content = SheetContent
TypedSheet.Footer = SheetFooter
TypedSheet.Trigger = SheetTrigger
TypedSheet.Portal = SheetPortal
TypedSheet.Overlay = SheetOverlay
TypedSheet.Description = SheetDescription
TypedSheet.Close = SheetPrimitive.Close

export {
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	TypedSheet as SheetPrimitive,
	SheetTitle,
	SheetTrigger,
}
