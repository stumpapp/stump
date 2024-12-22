import * as SeparatorPrimitive from '@radix-ui/react-separator'
import type { ComponentPropsWithoutRef, ElementRef } from 'react'
import * as React from 'react'

import { cn } from '../utils'

const Separator = React.forwardRef<
	ElementRef<typeof SeparatorPrimitive.Root>,
	ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
	<SeparatorPrimitive.Root
		ref={ref}
		decorative={decorative}
		orientation={orientation}
		className={cn(
			'bg-slate-200 dark:bg-slate-700',
			orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
			className,
		)}
		{...props}
	/>
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
