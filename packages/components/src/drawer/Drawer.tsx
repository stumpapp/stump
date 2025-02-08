import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import * as React from 'react'
import * as Vaul from 'vaul'

const DrawerPrimitive: typeof Vaul.Drawer = Vaul.Drawer

import { cn } from '../utils'

const Drawer = ({
	shouldScaleBackground = true,
	...props
}: ComponentPropsWithoutRef<typeof DrawerPrimitive.Root>) => (
	<DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = 'Drawer'

const DrawerTrigger: typeof DrawerPrimitive.Trigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose: typeof DrawerPrimitive.Close = DrawerPrimitive.Close

const DrawerOverlay: React.ForwardRefExoticComponent<
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay> &
		React.RefAttributes<ElementRef<typeof DrawerPrimitive.Overlay>>
> = React.forwardRef<
	ElementRef<typeof DrawerPrimitive.Overlay>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Overlay
		ref={ref}
		className={cn('fixed inset-0 z-50 bg-black/80', className)}
		{...props}
	/>
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

type DrawerContentProps = {
	showTopIndicator?: boolean
} & ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
const DrawerContent: typeof DrawerPrimitive.Content = React.forwardRef<
	ElementRef<typeof DrawerPrimitive.Content>,
	DrawerContentProps
>(({ className, children, showTopIndicator = true, ...props }, ref) => (
	<DrawerPortal>
		<DrawerOverlay />
		<DrawerPrimitive.Content
			ref={ref}
			className={cn(
				'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border border-edge-subtle bg-background outline-none',
				className,
			)}
			{...props}
		>
			{showTopIndicator && (
				<button
					type="button"
					className="bg-muted/40 hover:bg-muted/50 mx-auto mt-4 h-2 w-[100px] scale-[99%] rounded-full outline-none transition-all duration-200 hover:scale-100 active:scale-[99%]"
				/>
			)}
			{children}
		</DrawerPrimitive.Content>
	</DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerTitle: typeof DrawerPrimitive.Title = React.forwardRef<
	ElementRef<typeof DrawerPrimitive.Title>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Title
		ref={ref}
		className={cn(
			'text-lg font-semibold leading-none tracking-tight text-foreground-subtle',
			className,
		)}
		{...props}
	/>
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription: typeof DrawerPrimitive.Description = React.forwardRef<
	ElementRef<typeof DrawerPrimitive.Description>,
	ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Description
		ref={ref}
		className={cn('text-sm text-foreground-muted', className)}
		{...props}
	/>
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

type TypedDrawer = typeof Drawer & {
	Trigger: typeof DrawerTrigger
	Portal: typeof DrawerPortal
	Close: typeof DrawerClose
	Overlay: typeof DrawerOverlay
	Content: typeof DrawerContent
	Header: typeof DrawerHeader
	Footer: typeof DrawerFooter
	Title: typeof DrawerTitle
	Description: typeof DrawerDescription
}

const TypedDrawer = Drawer as TypedDrawer
TypedDrawer.Trigger = DrawerTrigger
TypedDrawer.Portal = DrawerPortal
TypedDrawer.Close = DrawerClose
TypedDrawer.Overlay = DrawerOverlay
TypedDrawer.Content = DrawerContent
TypedDrawer.Header = DrawerHeader
TypedDrawer.Footer = DrawerFooter
TypedDrawer.Title = DrawerTitle
TypedDrawer.Description = DrawerDescription

export { TypedDrawer as Drawer }
