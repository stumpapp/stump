import { Avatar, Card, cx, Popover, Text } from '@stump/components'
import { Bell, Settings } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useAppContext } from '../context'
import paths from '../paths'
import SignOut from './navigation/sidebar/SignOut'

type Props = {
	variant?: 'sidebar' | 'topbar'
}

export default function UserMenu({ variant = 'sidebar' }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const { user } = useAppContext()

	const avatarUrl = user.avatar_url || undefined
	const fallback = user.username.slice(0, 2).toUpperCase()
	const isSidebar = variant === 'sidebar'

	return (
		<AutoSizer style={{ height: '2.35rem', width: isSidebar ? '100%' : '2.35rem' }}>
			{({ width }) => (
				<Popover onOpenChange={setIsOpen} open={isOpen}>
					<Popover.Trigger asChild>
						<Card
							className={cx(
								'flex h-[2.35rem] w-full cursor-pointer items-center border-edge-200 border-opacity-80 px-1 transition-all duration-150 hover:border-opacity-100',
								{ 'border-opacity-100': isOpen },
								{ 'justify-center': !isSidebar },
							)}
						>
							<Avatar
								src={avatarUrl}
								fallback={fallback}
								fallbackWrapperClassName="text-xs select-none"
								rounded="lg"
								className="h-6 w-6"
							/>
							{isSidebar && (
								<Text className="ml-2 line-clamp-1 select-none text-ellipsis" size="sm">
									{user.username}
								</Text>
							)}
						</Card>
					</Popover.Trigger>

					<Popover.Content
						className="flex flex-col divide-y divide-edge overflow-hidden p-0 shadow-sm"
						align={isSidebar ? 'start' : 'end'}
						style={{ width: isSidebar ? width : 'auto' }}
					>
						<div className="flex w-full flex-col">
							<Link
								className="pointer-events-none flex h-[2.35rem] w-full items-center bg-background-200 px-2  text-sm text-muted transition-colors duration-150"
								to={paths.settings('server/notifications')}
								onClick={() => setIsOpen(false)}
							>
								<Bell className="mr-1.5 h-4 w-4 " />
								Notifications
							</Link>

							<Link
								className="flex h-[2.35rem] w-full items-center px-2 text-sm text-contrast-200 transition-colors duration-150 hover:bg-background-200"
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
