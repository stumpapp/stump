import { forwardRef } from 'react'

import { Text } from '../text'
import { cn } from '../utils'
import { AvatarPrimitive, AvatarPrimitiveRef } from './primitives'

// TODO: sizes that will handle scaling of the fallback text and avatar size
export type AvatarProps = {
	src?: string
	fallback?: React.ReactNode
	fallbackWrapperClassName?: string
	fallbackColor?: 'brand' | 'gray'
	rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
} & React.ComponentPropsWithoutRef<typeof AvatarPrimitive>
export const Avatar = forwardRef<AvatarPrimitiveRef, AvatarProps>(
	(
		{
			src,
			fallback,
			fallbackColor,
			fallbackWrapperClassName,
			rounded = 'full',
			className,
			...props
		},
		ref,
	) => {
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

		const roundedClassName = cn(
			{
				'rounded-none': rounded === 'none',
			},
			{
				'rounded-sm': rounded === 'sm',
			},
			{
				'rounded-md': rounded === 'md',
			},
			{
				'rounded-lg': rounded === 'lg',
			},
			{
				'rounded-full': rounded === 'full',
			},
		)

		return (
			<AvatarPrimitive className={cn(roundedClassName, className)} {...props} ref={ref}>
				<AvatarPrimitive.Image src={src} className={roundedClassName} />
				<AvatarPrimitive.Fallback
					asChild
					className={cn(
						{
							'bg-brand-400': fallbackColor === 'brand',
						},
						{
							'bg-background-surface': fallbackColor === 'gray',
						},
						roundedClassName,
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
