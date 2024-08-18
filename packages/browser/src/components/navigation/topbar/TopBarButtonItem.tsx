/* eslint-disable react/prop-types */

import { cn } from '@stump/components'
import React, { forwardRef } from 'react'

type Props = {
	isDisabled?: boolean
} & React.HTMLAttributes<HTMLDivElement>
const TopBarButtonItem = forwardRef<HTMLDivElement, Props>(
	({ className, isDisabled, ...props }, ref) => {
		return (
			<div
				ref={ref}
				{...props}
				className={cn(
					'text-foreground-subtle hover:bg-sidebar-surface-hover focus:bg-sidebar-surface flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 leading-none no-underline outline-none transition-colors',
					{ 'text-foreground-muted pointer-events-none': isDisabled },
					className,
				)}
			/>
		)
	},
)
TopBarButtonItem.displayName = 'TopBarButtonItem'

export default TopBarButtonItem
