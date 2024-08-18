import { cn } from '@stump/components'
import React, { ComponentProps } from 'react'
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
				'group inline-flex h-[2.35rem] w-full shrink-0 items-center justify-start rounded-md px-2 text-sm transition-all duration-150 hover:bg-sidebar-surface-hover',
				{
					'justify-center border border-dashed border-edge-subtle bg-opacity-50 text-foreground text-opacity-90 hover:bg-sidebar-surface hover:text-opacity-100':
						variant === 'action',
				},
				{ 'text-foreground': variant !== 'action' },
				{
					'bg-sidebar-surface hover:bg-sidebar-surface-hover': isActive,
				},
				{
					'bg-sidebar-surface-hover': isActive && variant === 'action',
				},
				className,
			)}
			{...props}
		>
			{leftContent}
			<Link
				to={to}
				className={cn('line-clamp-1 flex h-full w-full flex-1 items-center break-words p-0', {
					'justify-center': variant === 'action',
				})}
			>
				{children}
			</Link>
			{rightContent}
		</div>
	)
}
