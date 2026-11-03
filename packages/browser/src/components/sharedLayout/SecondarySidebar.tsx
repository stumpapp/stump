import { cn } from '@stump/components'
import { ArrowLeft, LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTheme } from '@/hooks/useTheme'

type ContainerProps = {
	children: ReactNode
	className?: string
}

/**
 * a sticky sidebar rendered next to the main content, e.g. for settings navigation
 */
function SecondarySidebarRoot({ children, className }: ContainerProps) {
	const { shouldUseGradient } = useTheme()

	return (
		<nav
			data-slot="secondary-sidebar"
			className={cn(
				'top-0 w-48 px-2 py-4 sticky z-40 flex h-(--main-height) shrink-0 flex-col self-start overflow-y-auto border-r border-border bg-background text-foreground',
				{
					'bg-linear-to-l from-background-gradient-from to-background-gradient-to':
						shouldUseGradient,
				},
				className,
			)}
		>
			<div className="gap-4 flex h-full grow flex-col">{children}</div>
		</nav>
	)
}

type BackProps = {
	to: string
	label: string
}

function SecondarySidebarBack({ to, label }: BackProps) {
	return (
		<Link
			to={to}
			replace
			className="gap-2 px-2 py-1.5 text-sm font-medium group flex items-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
		>
			<ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent-foreground" />
			<span className="line-clamp-1">{label}</span>
		</Link>
	)
}

type GroupProps = {
	label?: string
	children: ReactNode
}

function SecondarySidebarGroup({ label, children }: GroupProps) {
	return (
		<div data-slot="secondary-sidebar-group" className="gap-1 flex flex-col">
			{label && <span className="px-2 text-xs font-medium text-muted-foreground">{label}</span>}
			<ul className="gap-y-0.5 text-sm flex flex-col">{children}</ul>
		</div>
	)
}

type ItemProps = {
	to: string
	icon: LucideIcon
	children: ReactNode
	isActive?: boolean
	isDisabled?: boolean
	prefetch?: () => void
}

function SecondarySidebarItem({
	to,
	icon: Icon,
	children,
	isActive,
	isDisabled,
	prefetch,
}: ItemProps) {
	return (
		<li>
			<Link
				to={to}
				aria-current={isActive ? 'page' : undefined}
				aria-disabled={isDisabled}
				onMouseEnter={prefetch}
				className={cn(
					'gap-2 px-2 py-1.5 font-medium flex items-center rounded-md transition-colors',
					isDisabled
						? 'pointer-events-none text-foreground/50 opacity-50'
						: 'text-foreground hover:bg-accent hover:text-accent-foreground',
					{ 'bg-accent text-accent-foreground': isActive && !isDisabled },
				)}
			>
				<Icon className="h-4 w-4 shrink-0" />
				<span className="line-clamp-1">{children}</span>
			</Link>
		</li>
	)
}

export const SecondarySidebar = Object.assign(SecondarySidebarRoot, {
	Back: SecondarySidebarBack,
	Group: SecondarySidebarGroup,
	Item: SecondarySidebarItem,
})
