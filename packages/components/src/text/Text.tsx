import { cva, VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import React from 'react'

import { cn } from '../utils'

// TODO: common combination shortcuts, e.g. description, subtitle, etc.
export const TEXT_VARIANTS = {
	danger: 'text-destructive',
	default: 'text-foreground',
	label:
		'font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
	muted: 'text-muted-foreground',
	primary: 'text-brand',
	secondary: 'text-foreground',
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

type BaseProps = VariantProps<typeof textVariants> & ComponentPropsWithoutRef<'p'>
// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type TextProps = {
	className?: string
} & BaseProps

const Text = React.forwardRef<ElementRef<'p'>, TextProps>(
	({ className, variant, size, ...props }, ref) => (
		<p ref={ref} className={cn(textVariants({ size, variant }), className)} {...props} />
	),
)
Text.displayName = 'Text'

export { Text, textVariants }
