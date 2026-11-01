import { cn, IconButton } from '@stump/components'
import { ComponentProps, forwardRef } from 'react'

type Props = {
	/* when `on-overlay` we assume a black overlay */
	variant?: 'default' | 'on-overlay'
} & Omit<ComponentProps<typeof IconButton>, 'variant'>

const ControlButton = forwardRef<HTMLButtonElement, Props>(
	({ className, variant = 'default', ...props }, ref) => {
		return (
			<IconButton
				variant="ghost"
				size="sm"
				className={cn(
					'focus:ring-offset-black hover:bg-white/10 text-foreground hover:text-foreground',
					{
						'hover:bg-black/50 active:bg-black/50 aria-expanded:bg-black/50 aria-expanded:hover:bg-black/50 aria-expanded:text-white text-gray-450':
							variant === 'on-overlay',
					},
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
