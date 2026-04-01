import { cn, NavigationMenu } from '@stump/components'
import { PropsWithChildren } from 'react'
import { To } from 'react-router'
import { Link } from 'react-router-dom'

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
					'rounded-md px-3 py-2 flex w-full items-center leading-none text-foreground-subtle no-underline transition-colors outline-none select-none hover:bg-sidebar-surface-hover focus:bg-sidebar-surface',
					{ 'pointer-events-none text-foreground-muted': isDisabled },
					{ 'bg-sidebar-surface': isActive },
					className,
				)}
				{...props}
			>
				{children}
			</Link>
		</NavigationMenu.Link>
	)
}
