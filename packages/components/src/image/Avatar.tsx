import { forwardRef } from 'react'

import { AvatarPrimitive, AvatarPrimitiveRef } from './primitives'

export type AvatarProps = {
	src?: string
	fallback?: React.ReactNode
} & React.ComponentPropsWithoutRef<typeof AvatarPrimitive>
export const Avatar = forwardRef<AvatarPrimitiveRef, AvatarProps>(
	({ src, fallback, ...props }, ref) => {
		return (
			<AvatarPrimitive {...props} ref={ref}>
				<AvatarPrimitive.Image src={src} />
				<AvatarPrimitive.Fallback asChild={typeof fallback !== 'string'}>
					{fallback}
				</AvatarPrimitive.Fallback>
			</AvatarPrimitive>
		)
	},
)
Avatar.displayName = 'Avatar'
