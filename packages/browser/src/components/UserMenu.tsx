import { Avatar, cn, ConfirmationModal, Dropdown, Text } from '@stump/components'
import { Bell, Server, Settings } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AutoSizer from 'react-virtualized-auto-sizer'

import { usePaths } from '@/paths'
import { useAppStore } from '@/stores'

import { useAppContext } from '../context'

type Props = {
	variant?: 'sidebar' | 'topbar'
}

export default function UserMenu({ variant = 'sidebar' }: Props) {
	const [isOpen, setIsOpen] = useState(false)
	const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false)
	const navigate = useNavigate()

	const { logout, user } = useAppContext()

	const platform = useAppStore((store) => store.platform)
	const paths = usePaths()

	const avatarUrl = user.avatarUrl || undefined
	const fallback = user.username.slice(0, 2).toUpperCase()
	const isSidebar = variant === 'sidebar'

	return (
		<>
			<ConfirmationModal
				title="Sign out"
				description="Are you sure you want sign out?"
				confirmText="Sign out"
				confirmVariant="destructive"
				isOpen={isSignOutConfirmOpen}
				onClose={() => setIsSignOutConfirmOpen(false)}
				onConfirm={logout}
			/>

			<AutoSizer style={{ height: '2.25rem', width: isSidebar ? '100%' : '2.25rem' }}>
				{({ width }) => (
					<Dropdown open={isOpen} onOpenChange={setIsOpen} modal>
						<Dropdown.Trigger asChild>
							<div
								className={cn(
									'h-9 flex w-full cursor-pointer items-center border border-transparent transition-all duration-150',
									{ 'px-2 rounded-md': isSidebar },
									{ 'px-1 justify-center rounded-full': !isSidebar },
									{
										'bg-sidebar text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground':
											isSidebar,
									},
									{ 'border-sidebar-border/60': isSidebar && !isOpen },
									{
										'border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground':
											isSidebar && isOpen,
									},
									{ 'border-border/60 bg-background/70': !isSidebar && !isOpen },
									{ 'border-border/80 bg-background': !isSidebar && isOpen },
									{ 'hover:border-border/60 hover:bg-accent/40': !isSidebar },
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
									<Text className="ml-2 line-clamp-1 text-ellipsis select-none" size="sm">
										{user.username}
									</Text>
								)}
							</div>
						</Dropdown.Trigger>

						<Dropdown.Content
							className={cn(
								'p-1 shadow-md',
								isSidebar ? 'border-sidebar-border bg-sidebar text-sidebar-foreground' : '',
							)}
							align={isSidebar ? 'start' : 'end'}
							style={{ width: isSidebar ? width : 'auto' }}
						>
							<Dropdown.Group>
								<Dropdown.Item disabled className={cn(itemClasses(isSidebar), 'opacity-40')}>
									<Bell className="mr-1.5 h-4 w-4" />
									Notifications
								</Dropdown.Item>

								<Dropdown.Item
									onClick={() => navigate(paths.settings())}
									className={itemClasses(isSidebar)}
								>
									<Settings className="mr-1.5 h-4 w-4" />
									Settings
								</Dropdown.Item>
							</Dropdown.Group>

							<Dropdown.Separator className={isSidebar ? 'bg-sidebar-border' : ''} />

							<Dropdown.Group>
								{platform !== 'browser' && (
									<Dropdown.Item onClick={() => navigate('/')} className={itemClasses(isSidebar)}>
										<Server className="mr-1.5 h-4 w-4" />
										Switch server
									</Dropdown.Item>
								)}

								<Dropdown.Item
									onClick={() => setIsSignOutConfirmOpen(true)}
									isDestructive
									className={itemClasses(isSidebar, true)}
								>
									Sign out
								</Dropdown.Item>
							</Dropdown.Group>
						</Dropdown.Content>
					</Dropdown>
				)}
			</AutoSizer>
		</>
	)
}

const itemClasses = (isSidebar: boolean, isDestructive?: boolean) =>
	cn(
		'h-9 w-full gap-1.5 rounded-md bg-transparent px-3 text-sm transition-colors duration-150 outline-none',
		{
			'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[highlighted]:bg-sidebar-accent/60 data-[highlighted]:text-sidebar-accent-foreground':
				isSidebar && !isDestructive,
		},
		{ 'text-muted-foreground': !isSidebar && !isDestructive },
		{
			'hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground':
				!isSidebar && !isDestructive,
		},
		{
			'text-destructive hover:bg-destructive/25 data-[highlighted]:bg-destructive/25 data-[highlighted]:text-destructive':
				!!isDestructive,
		},
	)
