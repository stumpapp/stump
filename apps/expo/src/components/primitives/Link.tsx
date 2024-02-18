import { Link as NativeLink, ParamListBase } from '@react-navigation/native'
import { styled, StyledProps } from 'nativewind'
import { ComponentProps, forwardRef } from 'react'

import { cn } from '../utils'
import { TextProps, textVariants } from './Text'

type Props = {
	underline?: boolean
} & TextProps &
	StyledProps<ComponentProps<typeof NativeLink<ParamListBase>>>
const StyledLink = styled<Props>(NativeLink)

export const Link = forwardRef<typeof NativeLink, Props>(
	({ className, muted, size, underline, ...props }, ref) => (
		<StyledLink
			className={cn(
				textVariants({ size }),
				{ 'underline underline-offset-2': underline },
				muted ? 'text-gray-400 dark:text-gray-300' : 'text-black dark:text-white',
				className,
			)}
			{...props}
			ref={ref}
		/>
	),
)
Link.displayName = 'Link'
