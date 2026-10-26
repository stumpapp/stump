import { Avatar, cn, ConfirmationModal, Dropdown, Text } from '@stump/components'
import { Bell, LogOut, Server, Settings } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'
import { useAppStore } from '@/stores'

import { useAppContext } from '../context'
import { useIsSidebarIconMode } from './navigation/sidebar/CollapsedSidebarItems'

export default function UserMenu() {
	const [isOpen, setIsOpen] = useState(false)
	const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false)
	const navigate = useNavigate()

	const { logout, user } = useAppContext()
	const { t, translate } = useTranslate()

	const platform = useAppStore((store) => store.platform)
	const paths = usePaths()

	const avatarUrl = user.avatarUrl || user.avatar.url || undefined
	const fallback = user.username.slice(0, 2).toUpperCase()
	const isIconMode = useIsSidebarIconMode()

	return (
		<>
			<ConfirmationModal
				title={t('signOutModal.title')}
				description={t('signOutModal.message')}
				confirmText={t('signOutModal.buttons.signOut')}
				cancelText={translate('shared.common.cancel')}
				confirmVariant="destructive"
				isOpen={isSignOutConfirmOpen}
				onClose={() => setIsSignOutConfirmOpen(false)}
				onConfirm={logout}
				size="sm"
				icon={LogOut}
			/>

			<AutoSizer style={{ height: isIconMode ? '2rem' : '2.25rem', width: '100%' }}>
				{({ width }) => (
					<Dropdown open={isOpen} onOpenChange={setIsOpen} modal={false}>
						<Dropdown.Trigger asChild>
							<div
								aria-label={user.username}
								className={cn(
									isIconMode ? 'size-8 mx-auto justify-center' : 'h-9 px-2 w-full',
									'flex cursor-pointer items-center rounded-md border border-transparent bg-sidebar text-sidebar-foreground transition-all duration-150 hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
									isOpen
										? 'border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground'
										: 'border-sidebar-border/60',
								)}
							>
								<Avatar
									src={avatarUrl}
									fallback={fallback}
									fallbackWrapperClassName="text-xs select-none"
									className="h-6 w-6"
								/>
								{!isIconMode && (
									<Text className="ml-2 line-clamp-1 text-ellipsis select-none" size="sm">
										{user.username}
									</Text>
								)}
							</div>
						</Dropdown.Trigger>

						<Dropdown.Content
							className="p-1 shadow-md border-sidebar-border bg-sidebar text-sidebar-foreground"
							align="start"
							side={isIconMode ? 'right' : 'bottom'}
							style={{ width: isIconMode ? 224 : width }}
						>
							<Dropdown.Group>
								<Dropdown.Item disabled className={cn(itemClasses(), 'opacity-40')}>
									<Bell className="h-4 w-4" />
									Notifications
								</Dropdown.Item>

								<Dropdown.Item onClick={() => navigate(paths.settings())} className={itemClasses()}>
									<Settings className="h-4 w-4" />
									Settings
								</Dropdown.Item>
							</Dropdown.Group>

							<Dropdown.Separator className="bg-sidebar-border" />

							<Dropdown.Group>
								{platform !== 'browser' && (
									<Dropdown.Item onClick={() => navigate('/')} className={itemClasses()}>
										<Server className="h-4 w-4" />
										Switch server
									</Dropdown.Item>
								)}

								<Dropdown.Item
									onClick={() => setIsSignOutConfirmOpen(true)}
									variant="destructive"
									className={itemClasses(true)}
								>
									{t('signOutModal.buttons.signOut')}
								</Dropdown.Item>
							</Dropdown.Group>
						</Dropdown.Content>
					</Dropdown>
				)}
			</AutoSizer>
		</>
	)
}

const itemClasses = (isDestructive?: boolean) =>
	cn(
		'py-1 gap-1.5 px-3 text-sm w-full rounded-md bg-transparent transition-colors duration-150 outline-none',
		{
			'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground data-[highlighted]:bg-sidebar-accent/60 data-[highlighted]:text-sidebar-accent-foreground':
				!isDestructive,
		},
		{
			'text-destructive hover:bg-destructive/25 data-[highlighted]:bg-destructive/25 data-[highlighted]:text-destructive':
				!!isDestructive,
		},
	)
