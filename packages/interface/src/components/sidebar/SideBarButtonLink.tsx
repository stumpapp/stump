import { ButtonOrLink, cn } from '@stump/components'
import React, { ComponentProps } from 'react'

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
			size="sm"
			className={cn(
				'group w-full justify-start text-xs focus:ring-0 focus:ring-offset-0 dark:hover:bg-gray-900/70',
				{
					'justify-center border border-dashed border-gray-100/60 dark:border-gray-800':
						variant === 'action',
				},
				{ 'dark:bg-gray-900/70': isActive },
				className,
			)}
			newYork
		/>
	)
}
