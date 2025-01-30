import * as Slot from '@rn-primitives/slot'
import type { SlottableTextProps, TextRef } from '@rn-primitives/types'
import { cva, VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { Text as RNText } from 'react-native'

import { cn } from '~/lib/utils'

const HeadingClassContext = React.createContext<string | undefined>(undefined)

const headingVariants = cva('text-foreground font-bold leading-6', {
	variants: {
		size: {
			default: 'text-xl tablet:text-2xl',
			lg: 'text-2xl tablet:text-3xl',
		},
	},
	defaultVariants: {
		size: 'default',
	},
})

type HeadingProps = SlottableTextProps & VariantProps<typeof headingVariants>

const Heading = React.forwardRef<TextRef, HeadingProps>(
	({ className, asChild = false, size, ...props }, ref) => {
		const textClass = React.useContext(HeadingClassContext)
		const Component = asChild ? Slot.Text : RNText
		return (
			<Component
				className={cn(
					'leading-6 text-foreground',
					headingVariants({ size, className }),
					textClass,
					className,
				)}
				ref={ref}
				{...props}
			/>
		)
	},
)
Heading.displayName = 'Heading'

export { Heading, HeadingClassContext }
