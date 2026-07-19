import {
	Button,
	cn,
	DropdownMenu,
	DropdownMenuProps,
	Heading,
	Link,
	MiniStatCard,
	Tabs,
	useSticky,
} from '@stump/components'
import { EllipsisVertical, Info, Settings } from 'lucide-react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks'

type Stat = React.ComponentProps<typeof MiniStatCard> & { key: string }

type Tab = {
	isActive: boolean
	label: string
	onHover?: () => void
	to: string
}

type Props = {
	name: string
	tabs: Tab[]
	actions?: DropdownMenuProps['groups']
	stats?: Stat[]
	settingsLink?: string
	onInfoClick?: () => void
}

export function EntityHeader({ name, tabs, actions, stats, settingsLink, onInfoClick }: Props) {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const location = useLocation()
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const { ref, isSticky } = useSticky<HTMLDivElement>({
		extraOffset: isMobile || primaryNavigationMode === 'TOPBAR' ? 56 : 0,
	})

	const isSettingsActive = settingsLink ? location.pathname.includes(settingsLink) : false
	const activeTab = isSettingsActive
		? // a lil hacky but basically forcing a non-existing tab to be active so none are
			settingsLink
		: tabs.find((tab) => tab.isActive)?.to

	return (
		<div
			ref={ref}
			className={cn('top-0 h-12 sticky z-50 w-full border-b border-border transition-colors', {
				'bg-background': isSticky,
				'bg-transparent': !isSticky,
			})}
		>
			<div
				className={cn('h-12 px-4 gap-3 flex items-center', {
					'mx-auto': preferTopBar && !!layoutMaxWidthPx,
				})}
				style={{ maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined }}
			>
				<div className="gap-3 min-w-0 flex items-center">
					<Heading size="sm" className="shrink-0">
						{name}
					</Heading>

					{actions && (
						<DropdownMenu
							align="end"
							contentWrapperClassName="w-48"
							trigger={
								<Button variant="outline" size="icon" className="size-7 shrink-0">
									<EllipsisVertical className="h-4 w-4" />
								</Button>
							}
							groups={actions}
						/>
					)}

					{stats && (
						<div className="sm:flex gap-2 hidden items-center">
							{stats.map(({ key, ...stat }) => (
								<MiniStatCard key={key} {...stat} />
							))}
						</div>
					)}
				</div>

				<div className="flex-1" />

				{onInfoClick && (
					<button
						className="gap-1 px-1 py-1 group flex items-center rounded-lg bg-primary/15"
						onClick={onInfoClick}
					>
						<Info className="h-4 w-4 text-primary" />
					</button>
				)}

				<Tabs value={activeTab} size="sm">
					<Tabs.List>
						{tabs.map((tab) => (
							<Tabs.Trigger key={tab.to} value={tab.to} asChild>
								<Link to={tab.to} underline={false} onMouseEnter={tab.onHover}>
									{tab.label}
								</Link>
							</Tabs.Trigger>
						))}
					</Tabs.List>
				</Tabs>

				{settingsLink && (
					<Link
						to={settingsLink}
						underline={false}
						className={cn(
							'h-7 w-7 flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
							{ 'bg-muted text-foreground': isSettingsActive },
						)}
						aria-label="Settings"
					>
						<Settings className="h-4 w-4" />
					</Link>
				)}
			</div>
		</div>
	)
}
