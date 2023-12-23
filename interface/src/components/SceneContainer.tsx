import { cn } from '@stump/components'
import { ComponentPropsWithRef, forwardRef } from 'react'

type Props = ComponentPropsWithRef<'div'>
const SceneContainer = forwardRef<HTMLDivElement, Props>(({ className, ...props }, ref) => {
	// NOTE: adding padding bottom because of the overflow-hidden on the html element and the fixed
	// topbar. This is... annoying.
	return <div ref={ref} {...props} className={cn('p-4 pb-16 md:pb-4', className)} />
})
SceneContainer.displayName = 'SceneContainer'

export default SceneContainer
