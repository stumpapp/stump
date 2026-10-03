import { useGraphQLMutation, usePrefetchFiles, useSeriesStateMutation } from '@stump/client'
import { formatBytesSeparate } from '@stump/client'
import { ConfirmationModal } from '@stump/components'
import { DropdownItemGroup } from '@stump/components/dropdown/DropdownMenu'
import { extractErrorMessage, graphql, UserPermission } from '@stump/graphql'
import { formatHumanDurationSeparate, useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import {
	ArrowUpRight,
	BookCheck,
	BookOpen,
	BookOpenCheck,
	Clock,
	HardDrive,
	ListStart,
	ListX,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { EntityHeader } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

import CompleteSeriesConfirmation from './CompleteSeriesConfirmation'
import { useSeriesContext } from './context'
import { SeriesOverviewSheet } from './SeriesOverviewSheet'
import { usePrefetchSeriesBooks } from './tabs/books/queries'

const completeSeriesMutation = graphql(`
	mutation SeriesActionComplete($id: ID!) {
		finishSeriesProgress(id: $id)
	}
`)

export default function SeriesHeader() {
	const client = useQueryClient()
	const { checkPermission } = useAppContext()
	const { series } = useSeriesContext()
	const { t } = useLocaleContext()
	const {
		backlogSeries,
		canBacklog,
		unbacklogSeries,
		canUnbacklog,
		stopReread,
		canStopReread,
		resumeReread,
		canResumeReread,
	} = useSeriesStateMutation({
		fragment: series,
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ['seriesById', series.id], exact: false }),
	})
	const {
		id,
		resolvedName,
		path,
		stats,
		library: { id: libraryId },
	} = series

	const location = useLocation()
	const navigate = useNavigate()
	const paths = usePaths()
	const formattedTime = stats.totalReadingTimeSeconds
		? formatHumanDurationSeparate(stats.totalReadingTimeSeconds)
		: null
	const formattedSize = stats.totalBytes ? formatBytesSeparate(stats.totalBytes) : null

	const [showCompleteSeriesConfirmation, setShowCompleteSeriesConfirmation] = useState(false)
	const [isOverviewSheetOpen, setIsOverviewSheetOpen] = useState(false)
	const [showBacklogConfirmation, setShowBacklogConfirmation] = useState(false)
	const [showUnbacklogConfirmation, setShowUnbacklogConfirmation] = useState(false)
	const [showStopRereadConfirmation, setShowStopRereadConfirmation] = useState(false)
	const [showResumeRereadConfirmation, setShowResumeRereadConfirmation] = useState(false)

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

	const seriesStateActions = [
		...(canBacklog
			? [
					{
						label: t('seriesHeader.actions.backlogSeries.label'),
						leftIcon: <ListX className="mr-2 h-4 w-4" />,
						onClick: () => setShowBacklogConfirmation(true),
					},
				]
			: []),
		...(canUnbacklog
			? [
					{
						label: t('seriesHeader.actions.unbacklogSeries.label'),
						leftIcon: <ListStart className="mr-2 h-4 w-4" />,
						onClick: () => setShowUnbacklogConfirmation(true),
					},
				]
			: []),
		...(canStopReread
			? [
					{
						label: t('seriesHeader.actions.stopReread.label'),
						leftIcon: <ListX className="mr-2 h-4 w-4" />,
						onClick: () => setShowStopRereadConfirmation(true),
					},
				]
			: []),
		...(canResumeReread
			? [
					{
						label: t('seriesHeader.actions.resumeReread.label'),
						leftIcon: <ListStart className="mr-2 h-4 w-4" />,
						onClick: () => setShowResumeRereadConfirmation(true),
					},
				]
			: []),
	]

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
		...(seriesStateActions.length > 0 ? [{ items: seriesStateActions }] : []),
	] satisfies DropdownItemGroup[]

	const prefetchSeriesBooks = usePrefetchSeriesBooks()
	const prefetchFiles = usePrefetchFiles()

	const canAccessFiles = checkPermission(UserPermission.FileExplorer)

	const tabs = [
		{
			isActive: !!location.pathname.match(/\/series\/[^/]+\/books(\/.*)?$/),
			label: t('seriesHeader.tabs.books'),
			onHover: () => prefetchSeriesBooks(id),
			to: paths.seriesOverview(id),
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
						to: paths.seriesFileExplorer(id),
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

			<ConfirmationModal
				title={t('seriesHeader.actions.backlogSeries.label')}
				description={t('seriesHeader.actions.backlogSeries.description', {
					seriesName: resolvedName,
				})}
				isOpen={showBacklogConfirmation}
				onClose={() => setShowBacklogConfirmation(false)}
				onConfirm={() => {
					backlogSeries()
					setShowBacklogConfirmation(false)
				}}
			/>

			<ConfirmationModal
				title={t('seriesHeader.actions.unbacklogSeries.label')}
				description={t('seriesHeader.actions.unbacklogSeries.description', {
					seriesName: resolvedName,
				})}
				isOpen={showUnbacklogConfirmation}
				onClose={() => setShowUnbacklogConfirmation(false)}
				onConfirm={() => {
					unbacklogSeries()
					setShowUnbacklogConfirmation(false)
				}}
			/>

			<ConfirmationModal
				title={t('seriesHeader.actions.stopReread.label')}
				description={t('seriesHeader.actions.stopReread.description', {
					seriesName: resolvedName,
				})}
				isOpen={showStopRereadConfirmation}
				onClose={() => setShowStopRereadConfirmation(false)}
				onConfirm={() => {
					stopReread()
					setShowStopRereadConfirmation(false)
				}}
			/>

			<ConfirmationModal
				title={t('seriesHeader.actions.resumeReread.label')}
				description={t('seriesHeader.actions.resumeReread.description', {
					seriesName: resolvedName,
				})}
				isOpen={showResumeRereadConfirmation}
				onClose={() => setShowResumeRereadConfirmation(false)}
				onConfirm={() => {
					resumeReread()
					setShowResumeRereadConfirmation(false)
				}}
			/>

			<EntityHeader
				name={resolvedName}
				tabs={tabs}
				actions={actions}
				stats={resolvedStats}
				settingsLink={paths.seriesSettings(id)}
				onInfoClick={() => setIsOverviewSheetOpen(true)}
			/>

			<SeriesOverviewSheet
				isOpen={isOverviewSheetOpen}
				onClose={() => setIsOverviewSheetOpen(false)}
			/>
		</>
	)
}
