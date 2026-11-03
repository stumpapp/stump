import { cn, Dropdown, ToolTip } from '@stump/components'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { useLocalPreferencesStore } from '@/stores/user'

import { useSidebar } from './base'

/**
 * whether the sidebar is currently rendering only icons (collapsed+collapsible=icon)
 */
export function useIsSidebarIconMode() {
	const { state, isMobile } = useSidebar()
	const collapsible = useLocalPreferencesStore((store) => store.sidebar.collapsible)
	return !isMobile && state === 'collapsed' && collapsible === 'icon'
}

const iconButtonClasses = (isActive?: boolean) =>
	cn(
		'size-8 [&_svg]:size-4 mx-auto flex shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent/60 [&_svg]:shrink-0',
		{ 'bg-sidebar-accent text-sidebar-accent-foreground': isActive },
	)

export type CollapsedSectionItem = {
	key: string
	label: string
	to: string
	isActive?: boolean
	icon?: ReactNode
	onMouseEnter?: () => void
}

type SectionProps = {
	label: string
	icon: LucideIcon
	items: CollapsedSectionItem[]
	/** trailing actions, e.g. see all / create */
	actions?: CollapsedSectionItem[]
	emptyMessage?: string
}

/** an icon that opens a menu listing a section's entities, e.g. all libraries */
export function CollapsedSidebarSection({
	label,
	icon: Icon,
	items,
	actions = [],
	emptyMessage,
}: SectionProps) {
	const navigate = useNavigate()
	const isActive = items.some((item) => item.isActive)

	return (
		<Dropdown modal={false}>
			<ToolTip content={label} side="right" align="center" portal>
				<Dropdown.Trigger aria-label={label} className={iconButtonClasses(isActive)}>
					<Icon />
				</Dropdown.Trigger>
			</ToolTip>

			<Dropdown.Content side="right" align="start" sideOffset={8} className="w-56">
				<Dropdown.Label>{label}</Dropdown.Label>

				{items.length === 0 && emptyMessage && (
					<Dropdown.Item disabled>{emptyMessage}</Dropdown.Item>
				)}

				{items.map((item) => (
					<Dropdown.Item
						key={item.key}
						isActive={item.isActive}
						onMouseEnter={item.onMouseEnter}
						onSelect={() => navigate(item.to)}
					>
						{item.icon}
						<span className="truncate">{item.label}</span>
					</Dropdown.Item>
				))}

				{actions.length > 0 && (
					<>
						<Dropdown.Separator />
						{actions.map((action) => (
							<Dropdown.Item
								key={action.key}
								isActive={action.isActive}
								onSelect={() => navigate(action.to)}
								className="text-muted-foreground"
							>
								{action.icon}
								{action.label}
							</Dropdown.Item>
						))}
					</>
				)}
			</Dropdown.Content>
		</Dropdown>
	)
}
