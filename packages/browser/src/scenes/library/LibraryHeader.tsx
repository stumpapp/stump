import { formatBytesSeparate, usePrefetchFiles } from '@stump/client'
import { UserPermission } from '@stump/graphql'
import { formatHumanDurationSeparate, useLocaleContext } from '@stump/i18n'
import { BookCheck, BookOpen, Clock, HardDrive, Layers } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'

import { EntityHeader } from '@/components/sharedLayout'
import { useAppContext } from '@/context'

import { useLibraryContext } from './context'
import { LibraryOverviewSheet } from './LibraryOverviewSheet'
import { usePrefetchLibraryBooks } from './tabs/books/LibraryBooksScene'
import { usePrefetchLibrarySeries } from './tabs/series/LibrarySeriesScene'

export default function LibraryHeader() {
	const location = useLocation()
	const { t } = useLocaleContext()
	const {
		library: { id, name, path, stats, config },
	} = useLibraryContext()
	const { checkPermission } = useAppContext()

	const [isOverviewSheetOpen, setIsOverviewSheetOpen] = useState(false)

	const prefetchSeries = usePrefetchLibrarySeries()
	const prefetchBooks = usePrefetchLibraryBooks()
	const prefetchFiles = usePrefetchFiles()

	const handlePrefetchFiles = () => {
		prefetchFiles({ path, fetchConfig: checkPermission(UserPermission.UploadFile) })
	}

	const canAccessFiles = checkPermission(UserPermission.FileExplorer)
	const hideSeriesView = config?.hideSeriesView ?? false

	const formattedSize = stats?.totalBytes ? formatBytesSeparate(stats.totalBytes) : null
	const formattedTime = stats?.totalReadingTimeSeconds
		? formatHumanDurationSeparate(stats.totalReadingTimeSeconds)
		: null

	const tabs = [
		...(!hideSeriesView
			? [
					{
						isActive: !!location.pathname.match(/\/libraries\/[^/]+\/?(series)?$/),
						label: t('libraryHeader.tabs.series'),
						onHover: () => prefetchSeries(id),
						to: 'series',
					},
				]
			: []),
		{
			isActive: !!location.pathname.match(/\/libraries\/[^/]+\/books(\/.*)?$/),
			label: t('libraryHeader.tabs.books'),
			onHover: () => prefetchBooks(id),
			to: 'books',
		},
		...(canAccessFiles
			? [
					{
						isActive: !!location.pathname.match(/\/libraries\/[^/]+\/files(\/.*)?$/),
						label: t('libraryHeader.tabs.files'),
						onHover: () => handlePrefetchFiles(),
						to: 'files',
					},
				]
			: []),
	]

	const resolvedStats = stats
		? [
				...(!hideSeriesView
					? [
							{
								key: 'seriesCount',
								icon: Layers,
								value: stats.seriesCount,
							},
						]
					: []),
				{
					key: 'inProgressBooks',
					icon: BookOpen,
					value: stats.inProgressBooks,
				},
				{
					key: 'completedBooks',
					icon: BookCheck,
					value: stats.completedBooks,
					suffix: `/ ${stats.bookCount}`,
				},
				...(formattedTime
					? [
							{
								key: 'totalReadingTimeSeconds',
								icon: Clock,
								value: formattedTime.value,
								suffix: formattedTime.unit,
							},
						]
					: []),
				...(formattedSize
					? [
							{
								key: 'totalBytes',
								icon: HardDrive,
								value: formattedSize.value,
								suffix: formattedSize.unit,
							},
						]
					: []),
			]
		: undefined

	return (
		<>
			<EntityHeader
				name={name}
				tabs={tabs}
				stats={resolvedStats}
				settingsLink="settings"
				onInfoClick={() => setIsOverviewSheetOpen(true)}
			/>

			<LibraryOverviewSheet
				isOpen={isOverviewSheetOpen}
				onClose={() => setIsOverviewSheetOpen(false)}
			/>
		</>
	)
}
