import { useGraphQLMutation, usePrefetchFiles } from '@stump/client'
import { formatBytesSeparate } from '@stump/client'
import { DropdownItemGroup } from '@stump/components/dropdown/DropdownMenu'
import { extractErrorMessage, graphql, UserPermission } from '@stump/graphql'
import { formatHumanDurationSeparate, useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, BookCheck, BookOpen, BookOpenCheck, Clock, HardDrive } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { EntityHeader } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

import CompleteSeriesConfirmation from './CompleteSeriesConfirmation'
import { useSeriesContext } from './context'
import { SeriesOverviewSheet } from './SeriesOverviewSheet'
import { usePrefetchSeriesBooks } from './tabs/books/SeriesBooksScene'

const completeSeriesMutation = graphql(`
	mutation SeriesActionComplete($id: ID!) {
		finishSeriesProgress(id: $id)
	}
`)

export default function SeriesHeader() {
	const { checkPermission } = useAppContext()
	const {
		series: {
			id,
			resolvedName,
			path,
			stats,
			library: { id: libraryId },
		},
	} = useSeriesContext()
	const { t } = useLocaleContext()

	const location = useLocation()
	const navigate = useNavigate()
	const paths = usePaths()
	const formattedTime = stats.totalReadingTimeSeconds
		? formatHumanDurationSeparate(stats.totalReadingTimeSeconds)
		: null
	const formattedSize = stats.totalBytes ? formatBytesSeparate(stats.totalBytes) : null

	const [showCompleteSeriesConfirmation, setShowCompleteSeriesConfirmation] = useState(false)
	const [isOverviewSheetOpen, setIsOverviewSheetOpen] = useState(false)

	const client = useQueryClient()

	const onSuccess = () => {
		client.invalidateQueries({ queryKey: ['seriesBooks', id], exact: false })
	}

	const { mutate: completeSeries } = useGraphQLMutation(completeSeriesMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			toast.error(t('seriesHeader.errors.failedToUpdateCompletion'), {
				description: extractErrorMessage(error),
			})
		},
	})

	const actions = [
		{
			items: [
				{
					label: t('seriesHeader.actions.markAsRead'),
					leftIcon: <BookOpenCheck className="mr-2 h-4 w-4" />,
					onClick: () => {
						setShowCompleteSeriesConfirmation(true)
					},
				},
			],
		},
		{
			items: [
				{
					label: t('seriesHeader.actions.goToLibrary'),
					leftIcon: <ArrowUpRight className="mr-2 h-4 w-4" />,
					onClick: () => {
						navigate(paths.librarySeries(libraryId))
					},
				},
			],
		},
	] satisfies DropdownItemGroup[]

	const prefetchSeriesBooks = usePrefetchSeriesBooks()
	const prefetchFiles = usePrefetchFiles()

	const canAccessFiles = checkPermission(UserPermission.FileExplorer)

	const tabs = [
		{
			isActive: !!location.pathname.match(/\/series\/[^/]+\/books(\/.*)?$/),
			label: t('seriesHeader.tabs.books'),
			onHover: () => prefetchSeriesBooks(id),
			to: 'books',
		},
		...(canAccessFiles
			? [
					{
						isActive: !!location.pathname.match(/\/series\/[^/]+\/files(\/.*)?$/),
						label: t('seriesHeader.tabs.files'),
						onHover: () =>
							prefetchFiles({
								path,
								fetchConfig: checkPermission(UserPermission.UploadFile),
							}),
						to: 'files',
					},
				]
			: []),
	]

	const resolvedStats = stats
		? [
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
			<CompleteSeriesConfirmation
				isOpen={showCompleteSeriesConfirmation}
				onCancel={() => setShowCompleteSeriesConfirmation(false)}
				onConfirm={() => {
					completeSeries({ id: id })
					setShowCompleteSeriesConfirmation(false)
				}}
			/>

			<EntityHeader
				name={resolvedName}
				tabs={tabs}
				actions={actions}
				stats={resolvedStats}
				settingsLink="settings"
				onInfoClick={() => setIsOverviewSheetOpen(true)}
			/>

			<SeriesOverviewSheet
				isOpen={isOverviewSheetOpen}
				onClose={() => setIsOverviewSheetOpen(false)}
			/>
		</>
	)
}
