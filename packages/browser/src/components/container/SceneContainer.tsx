import { cn } from '@stump/components'
import { cva, VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

const variants = cva('p-4 pb-16 md:pb-4 relative flex w-full flex-col', {
	defaultVariants: {
		variant: 'default',
	},
	variants: {
		variant: {
			default: '',
			settings: 'gap-8 md:gap-12 max-w-4xl',
		},
	},
})

type SceneContainerProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof variants>

const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>(
	({ className, variant, ...props }, ref) => (
		<div ref={ref} className={cn(variants({ variant }), className)} {...props} />
	),
)
SceneContainer.displayName = 'SceneContainer'

export default SceneContainer
