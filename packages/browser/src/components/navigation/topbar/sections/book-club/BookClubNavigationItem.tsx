import { NavigationMenu } from '@stump/components'
import React from 'react'

import { EntityOptionProps } from '@/components/navigation/types'

const IS_DEVELOPMENT = import.meta.env.DEV

// TODO: implement me

type Props = EntityOptionProps
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function BookClubNavigationItem(_: Props) {
	if (!IS_DEVELOPMENT) {
		return null
	}

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger className="bg-sidebar text-contrast-300 hover:bg-sidebar-300">
				Book clubs
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div className="p-4 md:w-[400px]">TODO make me</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
