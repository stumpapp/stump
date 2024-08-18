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
					'flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 leading-none text-foreground-subtle no-underline outline-none transition-colors hover:bg-sidebar-surface-hover focus:bg-sidebar-surface',
					{ 'pointer-events-none text-foreground-muted': isDisabled },
					className,
				)}
			/>
		)
	},
)
TopBarButtonItem.displayName = 'TopBarButtonItem'

export default TopBarButtonItem
