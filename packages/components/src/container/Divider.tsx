/* eslint-disable react/prop-types */
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import React from 'react'

import { cn } from '../utils'

export const DIVIDER_VARIANTS = {
	default: 'bg-gray-200 dark:bg-gray-700',
	muted: ' bg-gray-75 dark:bg-gray-850',
}

export type DividerProps = {
	variant?: keyof typeof DIVIDER_VARIANTS
} & React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>

const Divider = React.forwardRef<React.ElementRef<typeof SeparatorPrimitive.Root>, DividerProps>(
	(
		{ className, orientation = 'horizontal', decorative = true, variant = 'default', ...props },
		ref,
	) => (
		<SeparatorPrimitive.Root
			ref={ref}
			decorative={decorative}
			orientation={orientation}
			className={cn(
				DIVIDER_VARIANTS[variant || 'default'] || DIVIDER_VARIANTS.default,
				orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
				className,
			)}
			{...props}
		/>
	),
)
Divider.displayName = SeparatorPrimitive.Root.displayName

export { Divider }
