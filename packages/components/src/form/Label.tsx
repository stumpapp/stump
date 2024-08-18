import * as LabelPrimitive from '@radix-ui/react-label'
import React from 'react'

import { cn } from '../utils'

// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
	className?: string
}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
	({ className, ...props }, ref) => (
		<LabelPrimitive.Root
			ref={ref}
			className={cn(
				'text-sm font-medium leading-none text-foreground-subtle peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
				className,
			)}
			{...props}
		/>
	),
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
