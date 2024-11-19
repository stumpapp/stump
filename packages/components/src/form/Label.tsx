import * as LabelPrimitive from '@radix-ui/react-label'
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react'

import { cn } from '../utils'

// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
	className?: string
}

const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
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
