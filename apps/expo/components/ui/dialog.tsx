import * as DialogPrimitive from '@rn-primitives/dialog'
import * as React from 'react'
import { Platform, StyleSheet, View, type ViewProps } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { icons } from '~/lib'
import { cn } from '~/lib/utils'

const { X } = icons

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlayWeb = React.forwardRef<DialogPrimitive.OverlayRef, DialogPrimitive.OverlayProps>(
	({ className, ...props }, ref) => {
		const { open } = DialogPrimitive.useRootContext()
		return (
			<DialogPrimitive.Overlay
				className={cn(
					'absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-black/80 p-2',
					open ? 'web:animate-in web:fade-in-0' : 'web:animate-out web:fade-out-0',
					className,
				)}
				{...props}
				ref={ref}
			/>
		)
	},
)

DialogOverlayWeb.displayName = 'DialogOverlayWeb'

const DialogOverlayNative = React.forwardRef<
	DialogPrimitive.OverlayRef,
	DialogPrimitive.OverlayProps
>(({ className, children, ...props }, ref) => {
	return (
		<DialogPrimitive.Overlay
			style={StyleSheet.absoluteFill}
			className={cn('flex items-center justify-center bg-black/80 p-2', className)}
			{...props}
			ref={ref}
		>
			<Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
				<>{children}</>
			</Animated.View>
		</DialogPrimitive.Overlay>
	)
})

DialogOverlayNative.displayName = 'DialogOverlayNative'

const DialogOverlay = Platform.select({
	web: DialogOverlayWeb,
	default: DialogOverlayNative,
})

const DialogContent = React.forwardRef<
	DialogPrimitive.ContentRef,
	DialogPrimitive.ContentProps & { portalHost?: string }
>(({ className, children, portalHost, ...props }, ref) => {
	const { open } = DialogPrimitive.useRootContext()
	return (
		<DialogPortal hostName={portalHost}>
			<DialogOverlay>
				<DialogPrimitive.Content
					ref={ref}
					className={cn(
						'border-border web:cursor-default web:duration-200 max-w-lg gap-4 rounded-lg border bg-background-surface p-6 shadow-lg',
						open
							? 'web:animate-in web:fade-in-0 web:zoom-in-95'
							: 'web:animate-out web:fade-out-0 web:zoom-out-95',
						className,
					)}
					{...props}
					// https://github.com/radix-ui/primitives/issues/1241#issuecomment-2589438039
					onCloseAutoFocus={(event) => {
						event.preventDefault()
						document.body.style.pointerEvents = ''
					}}
				>
					{children}
					<DialogPrimitive.Close
						className={
							'web:group web:ring-offset-background web:transition-opacity web:hover:opacity-100 web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2 web:disabled:pointer-events-none absolute right-4 top-4 rounded-sm p-0.5 opacity-70'
						}
					>
						<X
							size={Platform.OS === 'web' ? 16 : 18}
							className={cn('text-foreground-muted', open && 'text-foreground-muted')}
						/>
					</DialogPrimitive.Close>
				</DialogPrimitive.Content>
			</DialogOverlay>
		</DialogPortal>
	)
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: ViewProps) => (
	<View className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: ViewProps) => (
	<View
		className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
		{...props}
	/>
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<DialogPrimitive.TitleRef, DialogPrimitive.TitleProps>(
	({ className, ...props }, ref) => (
		<DialogPrimitive.Title
			ref={ref}
			className={cn(
				'native:text-xl text-lg font-semibold leading-none tracking-tight text-foreground',
				className,
			)}
			{...props}
		/>
	),
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
	DialogPrimitive.DescriptionRef,
	DialogPrimitive.DescriptionProps
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn('native:text-base text-sm text-foreground-muted', className)}
		{...props}
	/>
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

type TypedDialog = typeof Dialog & {
	Trigger: typeof DialogTrigger
	Portal: typeof DialogPortal
	Close: typeof DialogClose
	Overlay: typeof DialogOverlay
	Content: typeof DialogContent
	Header: typeof DialogHeader
	Footer: typeof DialogFooter
	Title: typeof DialogTitle
	Description: typeof DialogDescription
}
const TypedDialog = Dialog as TypedDialog
TypedDialog.Trigger = DialogTrigger
TypedDialog.Portal = DialogPortal
TypedDialog.Close = DialogClose
TypedDialog.Overlay = DialogOverlay
TypedDialog.Content = DialogContent
TypedDialog.Header = DialogHeader
TypedDialog.Footer = DialogFooter
TypedDialog.Title = DialogTitle
TypedDialog.Description = DialogDescription

export { TypedDialog as Dialog }
