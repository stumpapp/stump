import {
	Breadcrumbs,
	Button,
	DropdownMenu,
	DropdownMenuProps,
	Link,
	MiniStatCard,
	Tabs,
} from '@stump/components'
import { EllipsisVertical, Info, Settings } from 'lucide-react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { useTranslate } from '@/hooks/useTranslate'

import { BreadcrumbPageSwitcher } from '../navigation/BreadcrumbPageSwitcher'
import { HeaderIconButton } from './HeaderIconButton'
import { PageHeader } from './PageHeader'

type Stat = React.ComponentProps<typeof MiniStatCard> & { key: string }

type Tab = {
	isActive: boolean
	label: string
	onHover?: () => void
	to: string
}

export type EntityCrumb = {
	label: string
	to: string
}

type Props = {
	/** the name of the entity, will render as the current breadcrumb page */
	name: string
	/**
	 * the parent routes the entity, only the immediate parent
	 * is shown inline and anything else will collapse into a menu
	 */
	parents?: EntityCrumb[]
	tabs: Tab[]
	actions?: DropdownMenuProps['groups']
	stats?: Stat[]
	settingsLink?: string
	onInfoClick?: () => void
}

export function EntityHeader({
	name,
	parents = [],
	tabs,
	actions,
	stats,
	settingsLink,
	onInfoClick,
}: Props) {
	const location = useLocation()
	const isMobile = useMediaMatch('(max-width: 768px)')
	const { translate } = useTranslate()

	const isSettingsActive = settingsLink ? location.pathname.includes(settingsLink) : false
	const activeTab =
		(isSettingsActive
			? // a lil hacky but basically forcing a non-existing tab to be active so none are
				settingsLink
			: tabs.find((tab) => tab.isActive)?.to) ?? ''
	const activeTabLabel = tabs.find((tab) => tab.isActive)?.label

	// on small screens the tabs often don't fit well so i have them collapse into a trailing switcher
	// crumb. it isn't _perfect_ but is okay enough. frankly as long as mobile is functional enough
	// im happy, i use the mobile app and so RARELY visit web on my phone
	const showTabSwitcher = isMobile && tabs.length > 1 && !!activeTabLabel && !isSettingsActive

	return (
		<PageHeader>
			<PageHeader.Start>
				<Breadcrumbs
					maxVisible={2}
					segments={[
						...parents,
						{ label: name },
						...(showTabSwitcher && activeTabLabel
							? [
									{
										label: activeTabLabel,
										noShrink: true,
										render: (
											<BreadcrumbPageSwitcher
												title={activeTabLabel}
												groups={[
													{
														items: tabs.map(({ to, label, isActive }) => ({ to, label, isActive })),
													},
												]}
											/>
										),
									},
								]
							: []),
					]}
				/>

				{actions && (
					<DropdownMenu
						align="start"
						contentWrapperClassName="w-48"
						trigger={
							<Button variant="ghost" size="icon" className="size-7 shrink-0">
								<EllipsisVertical className="h-4 w-4" />
							</Button>
						}
						groups={actions}
					/>
				)}

				{stats && (
					<div className="lg:flex gap-2 hidden shrink-0 items-center">
						{stats.map(({ key, ...stat }) => (
							<MiniStatCard key={key} {...stat} />
						))}
					</div>
				)}
			</PageHeader.Start>

			<PageHeader.End>
				{onInfoClick && (
					<HeaderIconButton
						label={translate('shared.common.info')}
						icon={Info}
						onClick={onInfoClick}
					/>
				)}

				{!isMobile && tabs.length > 0 && (
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
				)}

				{settingsLink && (
					<HeaderIconButton
						label={translate('shared.common.settings')}
						icon={Settings}
						to={settingsLink}
						isActive={isSettingsActive}
					/>
				)}
			</PageHeader.End>
		</PageHeader>
	)
}
