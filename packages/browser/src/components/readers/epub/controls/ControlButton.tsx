/* eslint-disable @typescript-eslint/no-unused-vars */

import { IconButton } from '@stump/components'
import { ComponentProps, forwardRef } from 'react'

const ControlButton = forwardRef<HTMLButtonElement, ComponentProps<typeof IconButton>>(
	({ className, ...props }, ref) => {
		return (
			<IconButton
				variant="ghost"
				size="sm"
				className="hover:bg-accent"
				ref={ref}
				pressEffect={false}
				{...props}
			/>
		)
	},
)
ControlButton.displayName = 'ControlButton'

export default ControlButton
