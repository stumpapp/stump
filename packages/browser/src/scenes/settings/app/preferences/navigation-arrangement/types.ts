import { NavigationItem } from '@stump/sdk'

/**
 * A type representing a subset of the navigation items which have entity options.
 */
export type NavigationItemWithEntityOptions = Exclude<
	NavigationItem,
	{ type: 'Home' } | { type: 'Explore' }
>
/**
 * The options that can be set on an entity item in the navigation arrangement.
 */
export type IEntityOptions = Omit<NavigationItemWithEntityOptions, 'type'>
/**
 * A type guard to check if an item is a navigation item with entity options.
 */
export const isNavigationItemWithEntityOptions = (
	item: NavigationItem,
): item is NavigationItemWithEntityOptions => item.type !== 'Home' && item.type !== 'Explore'
