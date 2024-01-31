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
					'flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 leading-none text-contrast-200 no-underline outline-none transition-colors hover:bg-sidebar-300 focus:bg-sidebar-300',
					{ 'pointer-events-none text-muted': isDisabled },
					className,
				)}
			/>
		)
	},
)
TopBarButtonItem.displayName = 'TopBarButtonItem'

export default TopBarButtonItem
