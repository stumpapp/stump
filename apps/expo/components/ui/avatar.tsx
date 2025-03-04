import * as AvatarPrimitive from '@rn-primitives/avatar'
import * as React from 'react'

import { cn } from '~/lib/utils'

const AvatarPrimitiveRoot = AvatarPrimitive.Root
const AvatarPrimitiveImage = AvatarPrimitive.Image
const AvatarPrimitiveFallback = AvatarPrimitive.Fallback

const Avatar = React.forwardRef<AvatarPrimitive.RootRef, AvatarPrimitive.RootProps>(
	({ className, ...props }, ref) => (
		<AvatarPrimitiveRoot
			ref={ref}
			className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
			{...props}
		/>
	),
)
Avatar.displayName = AvatarPrimitiveRoot.displayName

const AvatarImage = React.forwardRef<AvatarPrimitive.ImageRef, AvatarPrimitive.ImageProps>(
	({ className, ...props }, ref) => (
		<AvatarPrimitiveImage
			ref={ref}
			className={cn('aspect-square h-full w-full', className)}
			{...props}
		/>
	),
)
AvatarImage.displayName = AvatarPrimitiveImage.displayName

const AvatarFallback = React.forwardRef<AvatarPrimitive.FallbackRef, AvatarPrimitive.FallbackProps>(
	({ className, ...props }, ref) => (
		<AvatarPrimitiveFallback
			ref={ref}
			className={cn(
				'bg-muted flex h-full w-full items-center justify-center rounded-full',
				className,
			)}
			{...props}
		/>
	),
)
AvatarFallback.displayName = AvatarPrimitiveFallback.displayName

export { Avatar, AvatarFallback, AvatarImage }
