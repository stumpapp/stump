import { cn, NavigationMenu, navigationMenuTriggerStyle } from '@stump/components'
import React, { PropsWithChildren } from 'react'
import { To } from 'react-router'
import { Link } from 'react-router-dom'

type Props = {
	to: string | To
	isActive?: boolean
	className?: string
}
export default function TopBarNavLink({
	to,
	isActive,
	children,
	className,
}: PropsWithChildren<Props>) {
	return (
		<NavigationMenu.Item>
			<Link to={to}>
				<NavigationMenu.Link
					className={cn(
						navigationMenuTriggerStyle({
							className: cn('bg-sidebar text-contrast-300 hover:bg-sidebar-300', {
								'bg-sidebar-300': isActive,
							}),
						}),
						className,
					)}
				>
					{children}
				</NavigationMenu.Link>
			</Link>
		</NavigationMenu.Item>
	)
}
