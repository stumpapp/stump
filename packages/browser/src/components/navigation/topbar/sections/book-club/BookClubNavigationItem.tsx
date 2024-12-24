import { cn, NavigationMenu } from '@stump/components'

import { EntityOptionProps } from '@/components/navigation/types'

const IS_DEVELOPMENT = import.meta.env.DEV

// TODO: implement me

type Props = EntityOptionProps

export default function BookClubNavigationItem({ width }: Props) {
	if (!IS_DEVELOPMENT) {
		return null
	}

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger className="bg-sidebar text-foreground-subtle hover:bg-sidebar-surface-hover">
				Book clubs
			</NavigationMenu.Trigger>
			<NavigationMenu.Content>
				<div
					style={{ width }}
					className={cn('flex min-h-[150px] gap-3 p-2', {
						'md:w-[400px] lg:w-[500px]': !width,
					})}
				>
					TODO make me
				</div>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
