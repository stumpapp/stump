import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'

// TODO: common combination shortcuts, e.g. description, subtitle, etc.
export const TEXT_VARIANTS = {
	danger: 'text-red-600 dark:text-red-400',
	default: 'text-contrast',
	label:
		'font-medium leading-none text-contrast-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
	muted: 'text-muted',
	primary: 'text-brand',
	secondary: 'text-contrast-400',
}

const textVariants = cva('', {
	defaultVariants: {
		size: 'md',
		variant: 'default',
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
		variant: TEXT_VARIANTS,
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

export { Text, textVariants }
