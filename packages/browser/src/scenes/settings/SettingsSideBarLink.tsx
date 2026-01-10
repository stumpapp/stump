import { cn } from '@stump/components'
import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
	to: string
	isActive?: boolean
	isDisabled?: boolean
	icon: LucideIcon
	children: React.ReactNode
	prefetch?: () => void
}

export default function SettingsSideBarLink({
	to,
	isActive,
	isDisabled,
	icon,
	children,
	prefetch,
}: Props) {
	const Icon = icon

	return (
		<Link to={to} className={cn({ 'pointer-events-none': isDisabled })}>
			<li
				className={cn(
					'flex items-center rounded-md px-2 py-1.5',
					isDisabled ? 'text-foreground-muted opacity-50' : 'hover:bg-background-surface-hover',
					{
						'bg-background-surface': isActive && !isDisabled,
					},
				)}
				{...(prefetch ? { onMouseEnter: prefetch } : {})}
			>
				<Icon className="mr-2 h-4 w-4 shrink-0" />
				<span className="ml-1 line-clamp-1 font-medium">{children}</span>
			</li>
		</Link>
	)
}
