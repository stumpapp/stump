/* eslint-disable @typescript-eslint/no-unused-vars */

import { IconButton } from '@stump/components'
import React, { ComponentProps, forwardRef } from 'react'

const ControlButton = forwardRef<HTMLButtonElement, ComponentProps<typeof IconButton>>(
	({ className, ...props }, ref) => {
		return (
			<IconButton
				variant="ghost"
				size="xs"
				className="dark:hover:bg-gray-900"
				ref={ref}
				pressEffect={false}
				{...props}
			/>
		)
	},
)
ControlButton.displayName = 'ControlButton'

export default ControlButton
