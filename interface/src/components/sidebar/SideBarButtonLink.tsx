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
				'hover:bg-background-300 group inline-flex h-[2.35rem] w-full items-center justify-start rounded-md px-2 text-sm transition-all duration-150',
				{
					'hover:bg-background-300 border-sidebar-300 text-contrast-200 justify-center border border-dashed bg-opacity-50 text-opacity-80 hover:text-opacity-100':
						variant === 'action',
				},
				{ 'text-contrast': variant !== 'action' },
				{
					'bg-background-300': isActive,
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
