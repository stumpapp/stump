import { cn } from '@stump/components'
import { forwardRef } from 'react'

type SceneContainerProps = React.HTMLAttributes<HTMLDivElement>

const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn('p-4 pb-16 md:pb-4 relative flex w-full flex-col', className)}
			{...props}
		/>
	),
)
SceneContainer.displayName = 'SceneContainer'

export default SceneContainer
