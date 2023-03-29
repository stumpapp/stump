import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'

import { cn } from '../utils'

// TODO: common combination shortcuts, e.g. description, subtitle, etc.
export const TEXT_VARIANTS = {
	default: 'text-gray-900 dark:text-gray-100',
	muted: 'text-gray-500 dark:text-gray-450',
	primary: 'text-brand',
	secondary: 'text-gray-700 dark:text-gray-300',
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
	// FIXME: not template string
	noOfLines?: number
} & BaseProps

const Text = React.forwardRef<React.ElementRef<'p'>, TextProps>(
	({ className, variant, size, noOfLines, ...props }, ref) => (
		<p
			ref={ref}
			className={cn(
				textVariants({ className, size, variant }),
				{ [`line-clamp-${noOfLines} [hyphens:auto]`]: noOfLines !== undefined },
				className,
			)}
			{...props}
		/>
	),
)
Text.displayName = 'Text'

export { Text, textVariants }
