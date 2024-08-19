import { cva, VariantProps } from 'class-variance-authority'
import { styled, StyledProps } from 'nativewind'
import { forwardRef } from 'react'
import { Text as NativeText, TextProps as NativeTextProps } from 'react-native'

import { cn } from '../utils'

const StyledText = styled(NativeText)

export type TextProps = {
	muted?: boolean
} & VariantProps<typeof textVariants>
type Props = TextProps & StyledProps<NativeTextProps>
export const Text = forwardRef<NativeText, Props>(({ className, size, muted, ...props }, ref) => {
	return (
		<StyledText
			className={cn(
				textVariants({ size }),
				muted ? 'text-gray-400 dark:text-gray-300' : 'text-black dark:text-white',
				className,
			)}
			{...props}
			ref={ref}
		/>
	)
})
Text.displayName = 'Text'

// FIXME: any dark variant classes defined here seem to be pruned...
export const textVariants = cva('', {
	defaultVariants: {
		size: 'md',
		// variant: 'default',
	},
	variants: {
		size: {
			'2xl': 'text-2xl',
			'3xl': 'text-3xl',
			'4xl': 'text-4xl',
			lg: 'text-lg',
			md: 'text-base',
			sm: 'text-sm',
			xl: 'text-xl',
			xs: 'text-xs',
		},
		// variant: {
		// 	danger: 'text-red-600 dark:text-red-400',
		// 	default: 'dark:text-white text-black',
		// 	label:
		// 		'font-medium leading-none text-foreground-subtle peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
		// 	muted: 'text-gray-400 dark:text-gray-300',
		// },
	},
})
