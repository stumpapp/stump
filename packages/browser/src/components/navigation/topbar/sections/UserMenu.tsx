import { invalidateQueries, useSDK } from '@stump/client'
import { Avatar, cn, NavigationMenu } from '@stump/components'
import { Bell, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useAppContext } from '@/context'
import paths from '@/paths'
import { useUserStore } from '@/stores'

import TopBarButtonItem from '../TopBarButtonItem'
import TopBarLinkListItem from '../TopBarLinkListItem'

export default function UserMenu() {
	const { sdk } = useSDK()
	const { user } = useAppContext()

	const setUser = useUserStore((store) => store.setUser)
	const navigate = useNavigate()

	const logout = async () => {
		try {
			await sdk.auth.logout()
			await invalidateQueries({ keys: [sdk.cacheKeys.claimStatus] })
			setUser(null)
			navigate('/auth')
		} catch (error) {
			console.error(error)
			toast.error('There was an error logging you out. Please try again.')
		}
	}

	const classes = cn(
		'rounded-full border border-transparent border-opacity-80 bg-sidebar text-foreground-subtle hover:border-edge-subtle hover:border-opacity-100 hover:bg-background-surface/50 data-[state=open]:border-edge-subtle data-[state=open]:border-opacity-100 data-[state=open]:bg-background-surface/50',
		// {
		// 	'border-edge-subtle border-opacity-100 bg-background-surface/50': isInSettingsSomewhere,
		// },
		// {
		// 	'h-[2.35rem] w-[2.35rem] p-0 px-0 py-0': enable_double_sidebar,
		// },
	)

	return (
		<NavigationMenu.Item>
			<NavigationMenu.Trigger className={classes} showChevron={false}>
				<Avatar
					src={user.avatarUrl || undefined}
					fallback={user.username.slice(0, 2).toUpperCase()}
					fallbackWrapperClassName="text-xs select-none"
					rounded="lg"
					className="h-6 w-6"
				/>
			</NavigationMenu.Trigger>
			<NavigationMenu.Content className="left-auto right-0">
				<ul className="flex flex-col text-sm md:w-48">
					<TopBarLinkListItem
						className="rounded-none py-3"
						to={paths.notifications()}
						isActive={location.pathname.startsWith(paths.notifications())}
						isDisabled
					>
						<Bell className="mr-2 h-4 w-4 shrink-0" />
						<span className="ml-1 line-clamp-1 font-medium">Notifications</span>
					</TopBarLinkListItem>

					<TopBarButtonItem className="rounded-none py-3" onClick={logout}>
						<LogOut className="mr-2 h-4 w-4 shrink-0" />
						Logout
					</TopBarButtonItem>
				</ul>
			</NavigationMenu.Content>
		</NavigationMenu.Item>
	)
}
