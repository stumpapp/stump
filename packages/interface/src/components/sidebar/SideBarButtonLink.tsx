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
				'group inline-flex h-[2.35rem] w-full items-center justify-start rounded-md px-2 text-sm transition-all duration-150 dark:hover:bg-gray-900/70',
				{
					'justify-center border border-dashed border-gray-150/60 text-black text-opacity-80 hover:text-opacity-100 dark:border-gray-750/80 dark:text-gray-50 dark:text-opacity-80 dark:hover:text-opacity-100':
						variant === 'action',
				},
				{ 'dark:text-gray-75': variant !== 'action' },
				{ 'dark:bg-gray-900/70': isActive },
				className,
			)}
			{...props}
		>
			{leftContent}
			<Link
				to={to}
				className={cn('line-clamp-1 flex h-full w-full items-center', {
					'justify-center': variant === 'action',
				})}
			>
				{children}
			</Link>
			{rightContent}
		</div>
	)
}
