import { NavigationItem } from '@stump/types'

export type NavigationItemWithEntityOptions = Exclude<
	NavigationItem,
	{ type: 'Home' } | { type: 'Explore' }
>
export type IEntityOptions = Omit<NavigationItemWithEntityOptions, 'type'>

export const isNavigationItemWithEntityOptions = (
	item: NavigationItem,
): item is NavigationItemWithEntityOptions => item.type !== 'Home' && item.type !== 'Explore'
