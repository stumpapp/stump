import { Avatar, Card, cx, Popover, Text } from '@stump/components'
import { Bell, Settings } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useAppContext } from '../context'
import paths from '../paths'
import SignOut from './sidebar/SignOut'

export default function UserMenu() {
	const [isOpen, setIsOpen] = useState(false)

	const { user } = useAppContext()

	const avatarUrl = user.avatar_url || undefined
	const fallback = user.username.slice(0, 2).toUpperCase()

	return (
		<AutoSizer style={{ height: '2.35rem', width: '100%' }}>
			{({ width }) => (
				<Popover onOpenChange={setIsOpen} open={isOpen}>
					<Popover.Trigger asChild>
						<Card
							className={cx(
								'border-edge-200 flex h-[2.35rem] w-full cursor-pointer items-center border-opacity-80 px-1 transition-all duration-150 hover:border-opacity-100',
								{ 'border-opacity-100': isOpen },
							)}
						>
							<Avatar
								src={avatarUrl}
								fallback={fallback}
								fallbackWrapperClassName="text-xs select-none"
								rounded="lg"
								className="h-6 w-6"
							/>
							<Text className="ml-2 line-clamp-1 select-none text-ellipsis" size="sm">
								{user.username}
							</Text>
						</Card>
					</Popover.Trigger>

					<Popover.Content
						className="divide-edge-200 bg-sidebar-200 border-edge-200 flex flex-col divide-y overflow-hidden p-0 shadow-sm"
						align="start"
						style={{ width }}
					>
						<div className="flex w-full flex-col">
							<Link
								className="bg-sidebar-300 text-muted pointer-events-none flex h-[2.35rem] w-full items-center  px-2 text-sm transition-colors duration-150"
								to={paths.settings('server/notifications')}
								onClick={() => setIsOpen(false)}
							>
								<Bell className="mr-1.5 h-4 w-4 " />
								Notifications
							</Link>

							<Link
								className="text-contrast-200 flex h-[2.35rem] w-full items-center px-2 text-sm transition-colors duration-150"
								to={paths.settings('app/general')}
								onClick={() => setIsOpen(false)}
							>
								<Settings className="mr-1.5 h-4 w-4" />
								Settings
							</Link>
						</div>

						<div className="w-full">
							<SignOut />
						</div>
					</Popover.Content>
				</Popover>
			)}
		</AutoSizer>
	)
}
