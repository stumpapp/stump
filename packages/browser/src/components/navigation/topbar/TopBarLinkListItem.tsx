import { cn, NavigationMenu } from '@stump/components'
import { PropsWithChildren } from 'react'
import { Link, To } from 'react-router'

type Props = {
	to: string | To
	isDisabled?: boolean
	isActive?: boolean
	className?: string
} & React.ComponentPropsWithoutRef<'a'>

export default function TopBarLinkListItem({
	to,
	isDisabled,
	isActive,
	children,
	className,
	...props
}: PropsWithChildren<Props>) {
	return (
		<NavigationMenu.Link asChild>
			<Link
				to={to}
				className={cn(
					'px-3 py-2 flex w-full items-center rounded-md leading-none text-sidebar-foreground no-underline transition-colors outline-none select-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground',
					{ 'pointer-events-none text-muted-foreground': isDisabled },
					{ 'bg-sidebar-accent text-sidebar-accent-foreground': isActive },
					className,
				)}
				{...props}
			>
				{children}
			</Link>
		</NavigationMenu.Link>
	)
}
