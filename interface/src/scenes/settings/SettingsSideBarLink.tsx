import { cn } from '@stump/components'
import { LucideIcon } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

type Props = {
	to: string
	isActive: boolean
	icon: LucideIcon
	children: React.ReactNode
}
export default function SettingsSideBarLink({ to, isActive, icon, children }: Props) {
	const Icon = icon

	return (
		<Link to={to}>
			<li
				className={cn('hover:bg-background-300 flex items-center rounded-md px-2 py-1.5', {
					'bg-background-300': isActive,
				})}
			>
				<Icon className="mr-2 h-4 w-4" />
				<span className="ml-1">{children}</span>
			</li>
		</Link>
	)
}
