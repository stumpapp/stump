import * as Slot from '@rn-primitives/slot'
import type { SlottableTextProps, TextRef } from '@rn-primitives/types'
import { cva, VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Text as RNText } from 'react-native'

import { cn } from '~/lib/utils'

const TextClassContext = React.createContext<string | undefined>(undefined)

const textVariants = cva('text-foreground', {
	variants: {
		size: {
			sm: 'text-sm tablet:text-base',
			default: 'text-base tablet:text-lg',
			lg: 'text-lg tablet:text-xl',
			xl: 'text-xl tablet:text-2xl',
		},
	},
	defaultVariants: {
		size: 'default',
	},
})

type TextProps = SlottableTextProps & VariantProps<typeof textVariants>

const Text = React.forwardRef<TextRef, TextProps>(
	({ className, asChild = false, size, ...props }, ref) => {
		const textClass = React.useContext(TextClassContext)
		const Component = asChild ? Slot.Text : RNText
		return (
			<Component
				className={cn('text-foreground', textVariants({ size, className }), textClass, className)}
				ref={ref}
				{...props}
			/>
		)
	},
)
Text.displayName = 'Text'

export { Text, TextClassContext }
