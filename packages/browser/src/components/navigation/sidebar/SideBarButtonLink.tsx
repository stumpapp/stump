import { cn, ToolTip } from '@stump/components'
import { LucideIcon } from 'lucide-react'
import { ComponentProps } from 'react'
import { Link } from 'react-router'

import { useIsSidebarIconMode } from './CollapsedSidebarItems'

type Props = {
	to: string
	variant?: 'action' | 'default'
	isActive?: boolean
	/**
	 * the icon to use when side is collapsed and set to show icons
	 */
	icon?: LucideIcon
	/** the tooltip label if collapsed and set to show icons */
	label?: string
	leftContent?: React.ReactNode
	rightContent?: React.ReactNode
} & Omit<ComponentProps<'div'>, 'ref'>

export default function SideBarButtonLink({
	to,
	variant = 'default',
	isActive,
	icon: Icon,
	label,
	className,
	children,
	leftContent,
	rightContent,
	onMouseEnter,
	...props
}: Props) {
	const isIconMode = useIsSidebarIconMode()
	const resolvedLabel = label ?? (typeof children === 'string' ? children : undefined)

	if (isIconMode && Icon) {
		return (
			<ToolTip content={resolvedLabel} side="right" align="center">
				<Link
					to={to}
					aria-label={resolvedLabel}
					aria-current={isActive ? 'page' : undefined}
					// @ts-expect-error: its fine, just div vs a event diff
					onMouseEnter={onMouseEnter}
					className={cn(
						'size-8 mx-auto flex shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
						{ 'bg-sidebar-accent text-sidebar-accent-foreground': isActive },
					)}
				>
					<Icon className="h-4 w-4" />
				</Link>
			</ToolTip>
		)
	}

	return (
		<div
			className={cn(
				'group h-8 px-2 text-sm inline-flex w-full shrink-0 items-center justify-start rounded-md text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
				{
					'justify-center border border-dashed border-border bg-input/30 hover:bg-input/60 hover:text-foreground':
						variant === 'action',
				},
				{
					'font-medium bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent':
						isActive,
				},
				{
					'bg-sidebar-accent/40 hover:bg-sidebar-accent/40': isActive && variant === 'action',
				},
				className,
			)}
			onMouseEnter={onMouseEnter}
			{...props}
		>
			{leftContent}
			<Link
				to={to}
				className={cn('p-0 line-clamp-1 flex h-full w-full flex-1 items-center wrap-break-word', {
					'justify-center': variant === 'action',
				})}
			>
				{Icon && <Icon className="mr-2 h-4 w-4 shrink-0" />}
				{children}
			</Link>
			{rightContent}
		</div>
	)
}
