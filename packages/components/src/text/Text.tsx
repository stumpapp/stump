import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'

// TODO: common combination shortcuts, e.g. description, subtitle, etc.

const textVariants = cva('', {
	defaultVariants: {
		size: 'md',
		variant: 'default',
	},
	variants: {
		size: {
			lg: 'text-lg',
			md: 'text-base',
			sm: 'text-sm',
			xl: 'text-xl',
			xs: 'text-xs',
		},
		variant: {
			default: 'text-gray-900 dark:text-gray-100',
			muted: 'text-gray-500 dark:text-gray-400',
			primary: 'text-brand',
			secondary: 'text-gray-700 dark:text-gray-300',
		},
	},
})

type BaseProps = VariantProps<typeof textVariants> & React.ComponentPropsWithoutRef<'p'>
// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type TextProps = {
	className?: string
} & BaseProps

const Text = React.forwardRef<React.ElementRef<'p'>, TextProps>(
	({ className, variant, size, ...props }, ref) => (
		<p ref={ref} className={cn(textVariants({ className, size, variant }))} {...props} />
	),
)
Text.displayName = 'Text'

export { Text }
