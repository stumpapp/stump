import { Link as NativeLink, ParamListBase } from '@react-navigation/native'
import { ComponentProps } from 'react'

import { cn } from '../utils'
import { TextProps, textVariants } from './Text'

type Props = {
	underline?: boolean
} & TextProps &
	ComponentProps<typeof NativeLink<ParamListBase>>

export const Link = ({ className, muted, size, underline, ...props }: Props) => (
	<NativeLink
		className={cn(
			textVariants({ size }),
			{ 'underline underline-offset-2': underline },
			muted ? 'text-gray-400 dark:text-gray-300' : 'text-black dark:text-white',
			className,
		)}
		{...props}
	/>
)
Link.displayName = 'Link'
