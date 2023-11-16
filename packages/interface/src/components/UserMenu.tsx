import { Avatar, Card, cx, Popover, Text } from '@stump/components'
import { Bell, Settings } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useAppContext } from '../context'
import paths from '../paths'
import SignOut from './sidebar/SignOut'
import ThemeSwitch from './sidebar/ThemeSwitch'

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
								'flex h-[2.35rem] w-full cursor-pointer items-center border-opacity-50 px-1 transition-all duration-150 hover:border-opacity-100 dark:border-opacity-40 dark:hover:border-opacity-80',
								{ 'border-opacity-100 dark:border-opacity-80': isOpen },
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
						className="flex flex-col divide-y divide-gray-75 overflow-hidden border-opacity-50 p-0 shadow-sm dark:divide-gray-800 dark:bg-gray-950"
						align="start"
						style={{ width }}
					>
						<div className="flex w-full flex-col">
							<Link
								className="pointer-events-none flex h-[2.35rem] w-full items-center bg-gray-50/80 px-2 text-sm transition-colors duration-150 hover:bg-gray-75/75 dark:bg-gray-700/20 dark:text-gray-400 dark:hover:bg-gray-900"
								to={paths.settings('general')}
								onClick={() => setIsOpen(false)}
							>
								<Bell className="mr-1.5 h-4 w-4 dark:text-gray-400" />
								Notifications
							</Link>

							<Link
								className="flex h-[2.35rem] w-full items-center px-2 text-sm transition-colors duration-150 hover:bg-gray-75/75 dark:text-gray-100 dark:hover:bg-gray-900"
								to={paths.settings('general')}
								onClick={() => setIsOpen(false)}
							>
								<Settings className="mr-1.5 h-4 w-4 dark:text-gray-150" />
								Settings
							</Link>
						</div>

						<div className="w-full">
							<ThemeSwitch />
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
