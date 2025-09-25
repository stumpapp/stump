import { cn, IconButton } from '@stump/components'
import { ComponentProps, forwardRef } from 'react'

const ControlButton = forwardRef<HTMLButtonElement, ComponentProps<typeof IconButton>>(
	({ className, ...props }, ref) => {
		return (
			<IconButton
				variant="ghost-on-black"
				size="xs"
				className={cn('hover:bg-fill-on-black focus:ring-offset-black', className)}
				ref={ref}
				pressEffect={false}
				{...props}
			/>
		)
	},
)
ControlButton.displayName = 'ControlButton'

export default ControlButton
