import {
	Breadcrumb,
	Button,
	cn,
	DropdownMenu,
	DropdownMenuProps,
	Heading,
	Link,
	MiniStatCard,
	Tabs,
} from '@stump/components'
import { EllipsisVertical, Info, Settings } from 'lucide-react'
import { useLocation } from 'react-router'

import { PageHeader } from './PageHeader'

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
	const location = useLocation()

	const isSettingsActive = settingsLink ? location.pathname.includes(settingsLink) : false
	const activeTab = isSettingsActive
		? // a lil hacky but basically forcing a non-existing tab to be active so none are
			settingsLink
		: tabs.find((tab) => tab.isActive)?.to

	return (
		<PageHeader>
			<div className="gap-3 min-w-0 flex items-center">
				{/*<Heading size="sm" className="shrink-0">
					{name}
				</Heading>*/}

				{/*TODO: i am tempted by this, it would remove the need for backling to lib in the actions
				menu, and with one action left i feel like that can just be relocated to a place in settings
				the problems i see are:
				- less prominent (ish) name in header, i think enough tho
				- i don't think two breadcrumbs for e.g. books would be good (i.e., library > series > bookname)
				  but not doing it would be inconsistent
				separately i think refactoring entity header would be good so that on mobile the tabs collapse to
				some other kind of nav? generally some space issues even on md breakpoint
						*/}
				<Breadcrumb>
					<Breadcrumb.List>
						<Breadcrumb.Link>Books</Breadcrumb.Link>
						<Breadcrumb.Separator />
						<Breadcrumb.Page>{name}</Breadcrumb.Page>
					</Breadcrumb.List>
				</Breadcrumb>

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
					<div className="md:flex gap-2 hidden items-center">
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
		</PageHeader>
	)
}
