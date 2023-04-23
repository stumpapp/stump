import { ComponentPropsWithoutRef, forwardRef } from 'react'

import { cn } from '../utils'

export type SpacerProps = ComponentPropsWithoutRef<'div'>
export const Spacer = forwardRef<HTMLDivElement, SpacerProps>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn('flex-1', className)} {...props} />
))
Spacer.displayName = 'Spacer'
