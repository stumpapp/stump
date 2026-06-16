import { usePrefetchFiles } from '@stump/client'
import { cn, Heading, Link, Tabs, useSticky } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { formatHumanDurationSeparate } from '@stump/i18n'
import {
	BookCheck,
	BookOpen,
	Clock,
	HardDrive,
	Info,
	Layers,
	LucideIcon,
	Settings,
} from 'lucide-react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import { useAppContext } from '@/context'
import { usePreferences } from '@/hooks'
import { formatBytesSeparate } from '@/utils/format'

import { useLibraryContext } from './context'
import { usePrefetchLibraryBooks } from './tabs/books/LibraryBooksScene'
import { usePrefetchLibrarySeries } from './tabs/series/LibrarySeriesScene'

// TODO(localization): Use localized strings for labels etc
export default function LibraryHeader() {
	const location = useLocation()
	const isMobile = useMediaMatch('(max-width: 768px)')
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const {
		library: { id, name, path, stats, config },
	} = useLibraryContext()
	const { checkPermission } = useAppContext()

	const prefetchSeries = usePrefetchLibrarySeries()
	const prefetchBooks = usePrefetchLibraryBooks()
	const prefetchFiles = usePrefetchFiles()

	const handlePrefetchFiles = () => {
		prefetchFiles({ path, fetchConfig: checkPermission(UserPermission.UploadFile) })
	}

	const { ref, isSticky } = useSticky<HTMLDivElement>({
		extraOffset: isMobile || primaryNavigationMode === 'TOPBAR' ? 56 : 0,
	})

	const canAccessFiles = checkPermission(UserPermission.FileExplorer)
	const hideSeriesView = config?.hideSeriesView ?? false
	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const formattedSize = stats?.totalBytes ? formatBytesSeparate(stats.totalBytes) : null
	const formattedTime = stats?.totalReadingTimeSeconds
		? formatHumanDurationSeparate(stats.totalReadingTimeSeconds)
		: null

	const tabs = [
		...(!hideSeriesView
			? [
					{
						isActive: !!location.pathname.match(/\/libraries\/[^/]+\/?(series)?$/),
						label: 'Series',
						onHover: () => prefetchSeries(id),
						to: 'series',
					},
				]
			: []),
		{
			isActive: !!location.pathname.match(/\/libraries\/[^/]+\/books(\/.*)?$/),
			label: 'Books',
			onHover: () => prefetchBooks(id),
			to: 'books',
		},
		...(canAccessFiles
			? [
					{
						isActive: !!location.pathname.match(/\/libraries\/[^/]+\/files(\/.*)?$/),
						label: 'Files',
						onHover: () => handlePrefetchFiles(),
						to: 'files',
					},
				]
			: []),
	]

	const activeTab = tabs.find((tab) => tab.isActive)?.to

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
					{stats && (
						<div className="sm:flex gap-2 hidden items-center">
							<MiniStatBadge icon={BookOpen} value={stats.inProgressBooks} />
							<MiniStatBadge
								icon={BookCheck}
								value={stats.completedBooks}
								suffix={`/ ${stats.bookCount}`}
							/>
							{stats.seriesCount != null && !hideSeriesView && (
								<MiniStatBadge icon={Layers} value={stats.seriesCount} />
							)}
							{formattedTime && (
								<MiniStatBadge
									icon={Clock}
									value={formattedTime.value}
									suffix={formattedTime.unit}
								/>
							)}
							{formattedSize && (
								<MiniStatBadge
									icon={HardDrive}
									value={formattedSize.value}
									suffix={formattedSize.unit}
								/>
							)}
						</div>
					)}
				</div>

				<div className="flex-1" />

				<div className="gap-1 px-1 py-1 group flex items-center rounded-lg bg-primary/15">
					<Info className="h-4 w-4 text-primary" />
				</div>

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

				<Link
					to="settings"
					underline={false}
					className="h-7 w-7 flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Library settings"
				>
					<Settings className="h-4 w-4" />
				</Link>
			</div>
		</div>
	)
}

type MiniStatBadgeProps = {
	icon?: LucideIcon
	value: string | number
	suffix?: string
}

// TODO: yoinked from expo but ignored colors for now, put somewhere else!

function MiniStatBadge({ icon: Icon, value, suffix }: MiniStatBadgeProps) {
	return (
		<div className="gap-1.5 px-1.5 py-1 flex items-center rounded-lg bg-muted">
			{Icon && (
				<div className="h-5 w-5 flex shrink-0 items-center justify-center rounded-md bg-muted-foreground/15">
					<Icon className="h-3 w-3 text-muted-foreground" />
				</div>
			)}
			<span className="text-xs font-semibold text-foreground tabular-nums">{value}</span>
			{suffix && <span className="text-xs font-medium text-foreground opacity-50">{suffix}</span>}
		</div>
	)
}
