import { cn, NavigationMenu } from '@stump/components'
import React, { PropsWithChildren } from 'react'
import { To } from 'react-router'
import { Link } from 'react-router-dom'

type Props = {
	to: string | To
	isDisabled?: boolean
	isActive?: boolean
	className?: string
}
export default function TopBarLinkListItem({
	to,
	isDisabled,
	isActive,
	children,
	className,
}: PropsWithChildren<Props>) {
	return (
		<NavigationMenu.Link asChild>
			<Link
				to={to}
				className={cn(
					'flex w-full select-none items-center rounded-md px-3 py-2 leading-none text-foreground-subtle no-underline outline-none transition-colors hover:bg-sidebar-surface-hover focus:bg-sidebar-surface',
					{ 'pointer-events-none text-foreground-muted': isDisabled },
					{ 'bg-sidebar-surface': isActive },
					className,
				)}
			>
				{children}
			</Link>
		</NavigationMenu.Link>
	)
}
