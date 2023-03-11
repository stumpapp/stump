import * as ProgressPrimitive from '@radix-ui/react-progress'
import React from 'react'

import { cn } from '../utils'

// TODO: color variants
// TODO: indeterminate state

// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type ProgressBarProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
	className?: string
	value?: number | null
}

export const ProgressBar = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressBarProps
>(({ className, value, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(
			'relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800',
			className,
		)}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className="h-full w-full flex-1 bg-gray-900 transition-all dark:bg-gray-400"
			style={{ transform: `trangrayX(-${100 - (value || 0)}%)` }}
		/>
	</ProgressPrimitive.Root>
))
ProgressBar.displayName = ProgressPrimitive.Root.displayName
