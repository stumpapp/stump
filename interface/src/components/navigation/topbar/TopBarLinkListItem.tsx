import { cn, NavigationMenu } from '@stump/components'
import React, { PropsWithChildren } from 'react'
import { To } from 'react-router'
import { Link } from 'react-router-dom'

type Props = {
	to: string | To
	isDisabled?: boolean
	isActive?: boolean
}
export default function TopBarLinkListItem({
	to,
	isDisabled,
	isActive,
	children,
}: PropsWithChildren<Props>) {
	return (
		<NavigationMenu.Link asChild>
			<Link
				to={to}
				className={cn(
					'flex w-full select-none items-center rounded-md px-3 py-2 leading-none text-contrast-200 no-underline outline-none transition-colors hover:bg-sidebar-300 focus:bg-sidebar-300',
					{ 'pointer-events-none text-muted': isDisabled },
					{ 'bg-sidebar-300': isActive },
				)}
			>
				{children}
			</Link>
		</NavigationMenu.Link>
	)
}
