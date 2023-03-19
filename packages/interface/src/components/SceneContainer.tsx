import { cn } from '@stump/components'
import { ComponentPropsWithRef, forwardRef } from 'react'

type Props = ComponentPropsWithRef<'div'>
const SceneContainer = forwardRef<HTMLDivElement, Props>(({ className, ...props }, ref) => {
	return <div ref={ref} {...props} className={cn('p-4', className)} />
})
SceneContainer.displayName = 'SceneContainer'

export default SceneContainer
