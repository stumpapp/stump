import * as SliderPrimitive from '@radix-ui/react-slider'
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react'

import { cn } from '../utils'

const Slider = forwardRef<
	ElementRef<typeof SliderPrimitive.Root>,
	ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn('relative flex w-full touch-none select-none items-center', className)}
		{...props}
	>
		<SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-fill-brand-secondary">
			<SliderPrimitive.Range className="absolute h-full bg-fill-brand" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb
			data-testid="sliderThumb"
			className="block h-4 w-4 rounded-full border border-edge bg-fill-brand shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-edge-brand disabled:pointer-events-none disabled:opacity-50"
		/>
	</SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
