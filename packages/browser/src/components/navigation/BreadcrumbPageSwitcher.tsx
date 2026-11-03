import { Breadcrumb, cn, Drawer } from '@stump/components'
import { ChevronsUpDown, LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useMediaMatch } from 'rooks'

export type PageSwitcherItem = {
	to: string
	label: string
	icon?: LucideIcon
	disabled?: boolean
	isActive: boolean
}

export type PageSwitcherGroup = {
	label?: string
	items: PageSwitcherItem[]
}

type Props = {
	title: string
	groups: PageSwitcherGroup[]
	/* when set the segment is NOT the current page, e.g. Users > Create User */
	to?: string
}

export function BreadcrumbPageSwitcher({ title, groups, to }: Props) {
	const isMobile = useMediaMatch('(max-width: 768px)')

	const [isOpen, setIsOpen] = useState(false)

	const hasItems = groups.some((group) => group.items.length > 0)

	// we only show the switcher for mobile, since there will always be a sidebar
	// for places we use this (at least for now)
	if (!isMobile || !hasItems) {
		return to ? (
			<Breadcrumb.Link asChild>
				<Link to={to}>{title}</Link>
			</Breadcrumb.Link>
		) : (
			<Breadcrumb.Page>{title}</Breadcrumb.Page>
		)
	}

	return (
		<Drawer open={isOpen} onOpenChange={setIsOpen} shouldScaleBackground={false}>
			<Drawer.Trigger asChild>
				<button
					type="button"
					className="gap-1 px-1.5 py-0.5 -mx-1.5 flex items-center rounded-md text-foreground transition-colors hover:bg-accent active:bg-accent"
				>
					<span className="line-clamp-1">{title}</span>
					<ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
				</button>
			</Drawer.Trigger>

			<Drawer.Content className="max-h-[80vh]">
				<Drawer.Header className="sr-only">
					<Drawer.Title>{title}</Drawer.Title>
				</Drawer.Header>

				<div className="gap-4 px-4 pt-4 pb-8 flex flex-col overflow-y-auto">
					{groups
						.filter((group) => group.items.length > 0)
						.map((group, idx) => (
							<div key={group.label ?? idx} className="gap-1 flex flex-col">
								{group.label && (
									<span className="px-2 pb-1 text-xs font-medium text-muted-foreground">
										{group.label}
									</span>
								)}

								{group.items.map(({ to, label, icon: Icon, disabled, isActive }) => (
									<Link
										key={to}
										to={to}
										onClick={() => setIsOpen(false)}
										aria-current={isActive ? 'page' : undefined}
										aria-disabled={disabled}
										className={cn(
											'h-11 gap-3 px-3 text-sm flex items-center rounded-lg text-foreground transition-colors hover:bg-accent/60',
											{ 'font-medium bg-accent text-accent-foreground': isActive },
											{ 'pointer-events-none opacity-50': disabled },
										)}
									>
										{Icon && <Icon className="size-4 shrink-0" />}
										<span className="line-clamp-1">{label}</span>
									</Link>
								))}
							</div>
						))}
				</div>
			</Drawer.Content>
		</Drawer>
	)
}
