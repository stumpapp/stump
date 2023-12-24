import { Label } from '@stump/components'
import { Bell, Brush, Cog, ShieldCheck, Users } from 'lucide-react'
import { useLocation } from 'react-router'

import SettingsSideBarLink from './SettingsSideBarLink'

export default function SettingsSideBar() {
	const location = useLocation()

	return (
		<div className="border-edge bg-background text-contrast-200 relative flex h-full w-48 shrink-0 flex-col gap-4 border-r px-2 py-4">
			{groups.map((group) => (
				<div key={group.label}>
					<Label>{group.label}</Label>

					<ul className="pt-2 text-sm">
						{group.items.map((item) => (
							<SettingsSideBarLink
								key={item.to}
								to={item.to}
								isActive={location.pathname.startsWith(item.to)}
								icon={item.icon}
							>
								{item.label}
							</SettingsSideBarLink>
						))}
					</ul>
				</div>
			))}
		</div>
	)
}

const groups = [
	{
		items: [
			{
				icon: Cog,
				label: 'General',
				to: '/settings/app/general',
			},
			{
				icon: Brush,
				label: 'Appearance',
				to: '/settings/app/appearance',
			},
		],
		label: 'Application',
	},
	{
		items: [
			{
				icon: Cog,
				label: 'General',
				to: '/settings/server/general',
			},
			{
				icon: Users,
				label: 'Users',
				to: '/settings/server/users',
			},
			{
				icon: ShieldCheck,
				label: 'Access',
				to: '/settings/server/access',
			},
			{
				icon: Bell,
				label: 'Notifications',
				to: '/settings/server/notifications',
			},
		],
		label: 'Server',
	},
]
