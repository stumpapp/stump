import { Avatar, Card, cn, Popover, Text } from '@stump/components'
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
							className={cn(
								'flex h-[2.35rem] w-full cursor-pointer items-center border-transparent border-opacity-80 px-1 transition-all duration-150 hover:border-opacity-100',
								{ 'border-edge-subtle border-opacity-100': isOpen },
								{ 'border-edge-subtle': isSidebar },
								{ 'justify-center rounded-full hover:border-edge-subtle': !isSidebar },
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
								className={cn(
									linkClasses(isSidebar),
									'pointer-events-none select-none',
									isSidebar ? 'bg-sidebar-overlay opacity-40' : '',
								)}
								to={paths.notifications()}
								onClick={() => setIsOpen(false)}
							>
								<Bell className="mr-1.5 h-4 w-4 " />
								Notifications
							</Link>

							<Link
								className={linkClasses(isSidebar)}
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

const linkClasses = (isSidebar: boolean) =>
	cn(
		'text-foreground-subtle flex h-[2.35rem] w-full items-center px-2 text-sm transition-colors duration-150',
		{ 'bg-sidebar-overlay hover:bg-sidebar-overlay-hover': isSidebar },
		{ 'hover:bg-background-surface': !isSidebar },
	)
