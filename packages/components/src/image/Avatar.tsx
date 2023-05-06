import { forwardRef } from 'react'

import { cx, Text } from '../index'
import { AvatarPrimitive, AvatarPrimitiveRef } from './primitives'

// TODO: sizes that will handle scaling of the fallback text and avatar size
export type AvatarProps = {
	src?: string
	fallback?: React.ReactNode
	fallbackWrapperClassName?: string
	fallbackColor?: 'brand' | 'gray'
} & React.ComponentPropsWithoutRef<typeof AvatarPrimitive>
export const Avatar = forwardRef<AvatarPrimitiveRef, AvatarProps>(
	({ src, fallback, fallbackColor, fallbackWrapperClassName, ...props }, ref) => {
		const renderFallback = () => {
			if (typeof fallback === 'string') {
				let resolvedStr: string = fallback
				// take first two letters of fallback and capitalize them
				const words = fallback.split(' ')
				if (words.length > 1) {
					resolvedStr = words
						.map((word) => word[0])
						.join('')
						.toUpperCase()
				} else {
					resolvedStr = fallback.slice(0, 2).toUpperCase()
				}

				return <Text>{resolvedStr}</Text>
			}
			return fallback
		}
		return (
			<AvatarPrimitive {...props} ref={ref}>
				<AvatarPrimitive.Image src={src} />
				<AvatarPrimitive.Fallback
					asChild
					className={cx(
						{
							'bg-brand-400 dark:bg-brand': fallbackColor === 'brand',
						},
						{
							'bg-gray-75 dark:bg-gray-800': fallbackColor === 'gray',
						},
						fallbackWrapperClassName,
					)}
				>
					{renderFallback()}
				</AvatarPrimitive.Fallback>
			</AvatarPrimitive>
		)
	},
)
Avatar.displayName = 'Avatar'
