import { cn, NavigationMenu, navigationMenuTriggerStyle } from '@stump/components'
import { PropsWithChildren } from 'react'
import { To } from 'react-router'
import { Link } from 'react-router-dom'

type Props = {
	to: string | To
	isActive?: boolean
	className?: string
	onMouseEnter?: () => void
}

export default function TopBarNavLink({
	to,
	isActive,
	children,
	className,
	onMouseEnter,
}: PropsWithChildren<Props>) {
	return (
		<NavigationMenu.Item>
			<Link to={to} onMouseEnter={onMouseEnter}>
				<NavigationMenu.Link
					className={cn(
						navigationMenuTriggerStyle({
							className: cn(
								'bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
								{
									'bg-sidebar-accent text-sidebar-accent-foreground': isActive,
								},
							),
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
