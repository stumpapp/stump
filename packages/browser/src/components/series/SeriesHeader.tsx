import { useGraphQLMutation, usePrefetchFiles } from '@stump/client'
import { formatBytesSeparate } from '@stump/client'
import { DropdownItemGroup } from '@stump/components/dropdown/DropdownMenu'
import { extractErrorMessage, graphql, UserPermission } from '@stump/graphql'
import { formatHumanDurationSeparate } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import {
	BookCheck,
	BookOpen,
	BookOpenCheck,
	Clock,
	FileSearch,
	HardDrive,
	Image,
	ImagePlus,
	ImageUp,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'

import { EntityHeader } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

import { CompleteSeriesConfirmation } from './CompleteSeriesConfirmation'
import { useSeriesContext } from './context'
import { usePrefetchSeriesBooks } from './queries'
import { SeriesOverviewSheet } from './SeriesOverviewSheet'
import { useSeriesThumbnailActions } from './useSeriesThumbnailActions'

const completeSeriesMutation = graphql(`
	mutation SeriesActionComplete($id: ID!) {
		finishSeriesProgress(id: $id)
	}
`)

const analyzeMutation = graphql(`
	mutation SeriesHeaderAnalyze($id: ID!) {
		analyzeSeries(id: $id)
	}
`)

export function SeriesHeader() {
	const { checkPermission } = useAppContext()
	const {
		series: {
			id,
			resolvedName,
			path,
			stats,
			library: { id: libraryId, name: libraryName },
		},
	} = useSeriesContext()
	const { t, translate } = useTranslate()

	const location = useLocation()

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

	const thumbnail = useSeriesThumbnailActions(id)
	const { mutate: analyze, isPending: isAnalyzing } = useGraphQLMutation(analyzeMutation, {
		onSuccess: () => toast.success('Analysis started'),
		onError: (error) => {
			console.error(error)
			toast.error('Failed to start analysis')
		},
	})

	const canAnalyze = checkPermission(UserPermission.ManageLibrary)
	const canEditThumbnail = checkPermission(UserPermission.EditThumbnails)
	const canUpload = checkPermission(UserPermission.UploadFile)

	const actions = [
		{
			items: [
				{
					label: t('seriesHeader.actions.markAsRead'),
					leftIcon: <BookOpenCheck />,
					onClick: () => {
						setShowCompleteSeriesConfirmation(true)
					},
				},
			],
		},
		{
			items: [
				...(canAnalyze
					? [
							{
								label: translate('shared.bookActions.analyze'),
								leftIcon: <FileSearch />,
								disabled: isAnalyzing,
								onClick: () => analyze({ id }),
							},
						]
					: []),
				...(canEditThumbnail
					? [
							{
								label: translate('shared.common.thumbnail'),
								leftIcon: <Image />,
								subItems: [
									{
										label: t('thumbnailSelector.chooseFromBooks'),
										leftIcon: <ImagePlus />,
										onClick: thumbnail.openSelector,
									},
									...(canUpload
										? [
												{
													label: t('thumbnailSelector.uploadImage'),
													leftIcon: <ImageUp />,
													onClick: thumbnail.openUpload,
												},
											]
										: []),
								],
							},
						]
					: []),
			],
		},
	].filter((group) => group.items.length > 0) satisfies DropdownItemGroup[]

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
						label: translate('shared.common.files'),
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
					suffix: ` / ${stats.bookCount}`,
				},
				...(formattedTime
					? [
							{
								key: 'totalReadingTimeSeconds',
								icon: Clock,
								value: formattedTime[0]?.value ?? '??',
								suffix: formattedTime[0]?.unit ?? undefined,
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
				parents={[
					{ label: translate('shared.common.libraries'), to: paths.libraries() },
					{ label: libraryName, to: paths.librarySeries(libraryId) },
				]}
				tabs={tabs}
				actions={actions}
				stats={resolvedStats}
				settingsLink={paths.seriesSettings(id)}
				onInfoClick={() => setIsOverviewSheetOpen(true)}
			/>

			{canEditThumbnail && thumbnail.dialogs}

			<SeriesOverviewSheet
				isOpen={isOverviewSheetOpen}
				onClose={() => setIsOverviewSheetOpen(false)}
			/>
		</>
	)
}
