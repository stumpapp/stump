import { cn, IconButton } from '@stump/components'
import { ComponentProps, forwardRef } from 'react'

const ControlButton = forwardRef<HTMLButtonElement, ComponentProps<typeof IconButton>>(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	({ className, variant: _variant, ...props }, ref) => {
		return (
			<IconButton
				variant="ghost"
				size="sm"
				className={cn(
					'focus:ring-offset-black hover:bg-white/10 text-foreground hover:text-foreground',
					className,
				)}
				ref={ref}
				{...props}
			/>
		)
	},
)
ControlButton.displayName = 'ControlButton'

export default ControlButton
