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
							className: cn('bg-sidebar text-foreground-subtle hover:bg-sidebar-surface-hover', {
								'bg-sidebar-surface': isActive,
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
