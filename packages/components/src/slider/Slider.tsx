import * as SliderPrimitive from '@radix-ui/react-slider'
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react'

import { cn } from '../utils'

const Slider = forwardRef<
	ElementRef<typeof SliderPrimitive.Root>,
	ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn('relative flex w-full touch-none items-center select-none', className)}
		{...props}
	>
		<SliderPrimitive.Track className="h-1.5 relative w-full grow overflow-hidden rounded-full bg-fill-brand-secondary">
			<SliderPrimitive.Range className="absolute h-full bg-fill-brand" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb
			data-testid="sliderThumb"
			className="h-4 w-4 shadow block rounded-full border border-edge bg-fill-brand transition-colors focus-visible:ring-1 focus-visible:ring-edge-brand focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
		/>
	</SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
