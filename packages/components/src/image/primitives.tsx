import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio'
import * as AvatarRadix from '@radix-ui/react-avatar'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

export type AvatarPrimitiveRef = ElementRef<typeof AvatarRadix.Root>
const AvatarPrimitive = React.forwardRef<
	AvatarPrimitiveRef,
	ComponentPropsWithoutRef<typeof AvatarRadix.Root>
>(({ className, ...props }, ref) => (
	<AvatarRadix.Root
		ref={ref}
		className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
		{...props}
	/>
))
AvatarPrimitive.displayName = AvatarRadix.Root.displayName

const AvatarImage = React.forwardRef<
	ElementRef<typeof AvatarRadix.Image>,
	ComponentPropsWithoutRef<typeof AvatarRadix.Image>
>(({ className, ...props }, ref) => (
	<AvatarRadix.Image
		ref={ref}
		className={cn('aspect-square h-full w-full', className)}
		{...props}
	/>
))
AvatarImage.displayName = AvatarRadix.Image.displayName

const AvatarFallback = React.forwardRef<
	ElementRef<typeof AvatarRadix.Fallback>,
	ComponentPropsWithoutRef<typeof AvatarRadix.Fallback>
>(({ className, ...props }, ref) => (
	<AvatarRadix.Fallback
		ref={ref}
		className={cn(
			'flex h-full w-full items-center justify-center rounded-full bg-background-surface',
			className,
		)}
		{...props}
	/>
))
AvatarFallback.displayName = AvatarRadix.Fallback.displayName

type AvatarSubComponents = {
	Image: typeof AvatarImage
	Fallback: typeof AvatarFallback
}

const TypedAvatar = AvatarPrimitive as typeof AvatarPrimitive & AvatarSubComponents
TypedAvatar.Image = AvatarImage
TypedAvatar.Fallback = AvatarFallback

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }
export { AvatarFallback, AvatarImage, TypedAvatar as AvatarPrimitive }
