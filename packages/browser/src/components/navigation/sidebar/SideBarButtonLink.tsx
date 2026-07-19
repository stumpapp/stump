import { cn } from '@stump/components'
import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

// TODO: tooltips, but currently they don't work with links...
type Props = {
	to: string
	variant?: 'action' | 'default'
	isActive?: boolean
	leftContent?: React.ReactNode
	rightContent?: React.ReactNode
} & Omit<ComponentProps<'div'>, 'ref'>

export default function SideBarButtonLink({
	to,
	variant = 'default',
	isActive,
	className,
	children,
	leftContent,
	rightContent,
	...props
}: Props) {
	return (
		<div
			className={cn(
				'group h-9 px-3 text-sm inline-flex w-full shrink-0 items-center justify-start rounded-md text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
				{
					'justify-center border border-dashed border-sidebar-border text-sidebar-foreground/90 hover:border-sidebar-border hover:bg-sidebar-accent/35 hover:text-sidebar-accent-foreground':
						variant === 'action',
				},
				{
					'font-medium bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent':
						isActive,
				},
				{
					'bg-sidebar-accent': isActive && variant === 'action',
				},
				className,
			)}
			{...props}
		>
			{leftContent}
			<Link
				to={to}
				className={cn('p-0 line-clamp-1 flex h-full w-full flex-1 items-center wrap-break-word', {
					'justify-center': variant === 'action',
				})}
			>
				{children}
			</Link>
			{rightContent}
		</div>
	)
}
