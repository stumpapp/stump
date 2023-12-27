import { NavigationMenu, navigationMenuTriggerStyle } from '@stump/components'
import React from 'react'

export default function BookClubNavigationItem() {
	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger
				className={navigationMenuTriggerStyle({
					className: 'bg-sidebar text-contrast-300 hover:bg-sidebar-300',
				})}
			>
				Book clubs
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div className="p-4 md:w-[400px]">TODO make me</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
