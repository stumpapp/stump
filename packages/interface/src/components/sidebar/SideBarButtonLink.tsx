import { ButtonOrLink, cn } from '@stump/components'
import React, { ComponentProps } from 'react'

// TODO: tooltips, but currently they don't work with links...
type Props = {
	variant?: 'action' | 'default'
	isActive?: boolean
} & Omit<ComponentProps<typeof ButtonOrLink>, 'variant'>
export default function SideBarButtonLink({
	variant = 'default',
	isActive,
	className,
	...props
}: Props) {
	return (
		<ButtonOrLink
			{...props}
			variant="ghost"
			size="md"
			className={cn(
				'group w-full justify-start px-2 text-sm focus:ring-0 focus:ring-offset-0 dark:hover:bg-gray-900/70',
				{
					'justify-center border border-dashed border-gray-150/60 dark:border-gray-750/80':
						variant === 'action',
				},
				{ 'dark:text-gray-50': variant !== 'action' },
				{ 'dark:bg-gray-900/70': isActive },
				className,
			)}
			newYork
		/>
	)
}
