import { useGraphQLMutation } from '@stump/client'
import { graphql, SeriesBooksSceneSeriesNameQuery, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { isAfter } from 'date-fns'
import { BookX, DownloadCloud, Info, PauseCircle, PlayCircle, ScanLine } from 'lucide-react-native'
import { useMemo } from 'react'
import { Alert } from 'react-native'

import { useEntityListHeader } from '~/components/filter/EntityListHeader'
import { ActionDef } from '~/components/filter/types'
import { MiniEntityStatCards } from '~/components/stats'
import { useTranslate } from '~/lib/hooks'
import { useStumpServer } from '~/providers/StumpServerProvider'

import { useBooksFilterMenu } from './BooksFilterMenu'
import { useSeriesBooksSortAndDisplayMenu } from './SeriesBooksSortAndDisplayMenu'

const scanMutation = graphql(`
	mutation SeriesBooksListHeaderScanSeries($id: ID!) {
		scanSeries(id: $id)
	}
`)

const dropMutation = graphql(`
	mutation SeriesBooksListHeaderDropSeries($id: ID!) {
		dropSeries(id: $id) {
			droppedAt
		}
	}
`)

const undropMutation = graphql(`
	mutation SeriesBooksListHeaderUndropSeries($id: ID!) {
		undropSeries(id: $id) {
			droppedAt
		}
	}
`)

const stopRereadMutation = graphql(`
	mutation SeriesBooksListHeaderStopReread($id: ID!) {
		stopSeriesReread(id: $id) {
			stoppedReadthroughAt
		}
	}
`)

const resumeRereadMutation = graphql(`
	mutation SeriesBooksListHeaderResumeReread($id: ID!) {
		resumeSeriesReread(id: $id) {
			stoppedReadthroughAt
		}
	}
`)

type SeriesActionsProps = {
	onShowOverview: () => void
	onDownloadSeries: () => void
}

type SeriesState = NonNullable<
	NonNullable<SeriesBooksSceneSeriesNameQuery['seriesById']>['userSeriesState']
>

type Props = {
	seriesId: string
	layoutKey: string
	stats: NonNullable<SeriesBooksSceneSeriesNameQuery['seriesById']>['stats']
	seriesState: SeriesState | null
	lastReadAt: string | null | undefined
	currentReadthrough?: number | null
	additionalActions: SeriesActionsProps
}

export function SeriesBooksListHeader({
	seriesId,
	layoutKey,
	stats,
	seriesState,
	lastReadAt,
	currentReadthrough,
	additionalActions,
}: Props) {
	const client = useQueryClient()

	const onSuccess = () =>
		client.invalidateQueries({ queryKey: ['seriesById', seriesId], exact: false })

	const { mutate: scanSeries } = useGraphQLMutation(scanMutation, {
		onSuccess: () => setTimeout(onSuccess, 2000), // a bit of a naive approach but prolly fine
	})
	const { mutate: dropSeries } = useGraphQLMutation(dropMutation, { onSuccess })
	const { mutate: undropSeries } = useGraphQLMutation(undropMutation, {
		onSuccess,
	})
	const { mutate: stopReread } = useGraphQLMutation(stopRereadMutation, {
		onSuccess,
	})
	const { mutate: resumeReread } = useGraphQLMutation(resumeRereadMutation, {
		onSuccess,
	})

	const { checkPermission } = useStumpServer()
	const { t } = useTranslate()

	// TODO(localization): add keys after the existing effort to avoid conflicts
	// TODO(on-deck): ughhh it was such a good idea at the time to push all destructive actions
	// to the end in useSortAndDisplayMenu but now things aren't grouped how i want them.
	// its fine for now, but annoying >:(
	// TODO(on-deck): pick icons, did not have much time to be thoughtful abt it

	const actions = useMemo(() => {
		const isDropped = !!seriesState?.droppedAt
		const hasProgress = (stats?.completedBooks ?? 0) > 0
		const isRereading = (currentReadthrough ?? 0) > 1

		const stopped_at = seriesState?.stoppedReadthroughAt
		const isReadthroughStopped = lastReadAt && stopped_at ? isAfter(lastReadAt, stopped_at) : false

		const result: ActionDef[] = [
			{
				key: 'overview',
				label: 'Overview',
				icon: { ios: 'info.circle', android: Info },
				onPress: additionalActions.onShowOverview,
			},
		]

		// can only un-drop if you have dropped
		if (isDropped) {
			result.push({
				key: 'undrop',
				label: 'Un-drop Series',
				icon: { ios: 'arrow.uturn.up.circle', android: PlayCircle },
				onPress: () => undropSeries({ id: seriesId }),
			})
		} else {
			// can only stop a re-read if you are re-reading
			if (isRereading && !isReadthroughStopped) {
				result.push({
					key: 'stop-reread',
					label: 'Stop Re-read',
					icon: { ios: 'pause.circle', android: PauseCircle },
					onPress: () =>
						Alert.alert(
							'Stop Re-read',
							'Only the latest unread books will be shown in on-deck suggestions. You can resume the re-read at any time',
							[
								{ text: t('common.cancel'), style: 'cancel' },
								{ text: 'Stop Re-read', onPress: () => stopReread({ id: seriesId }) },
							],
						),
				})
			}

			// can only resume a re-read if you have stopped it
			if (isReadthroughStopped) {
				result.push({
					key: 'resume-reread',
					label: 'Resume Re-read',
					icon: { ios: 'play.circle', android: PlayCircle },
					onPress: () => resumeReread({ id: seriesId }),
				})
			}

			// can drop if you have any progress
			if (hasProgress) {
				result.push({
					key: 'drop',
					label: 'Drop Series',
					icon: { ios: 'xmark.circle', android: BookX },
					destructive: true,
					onPress: () =>
						Alert.alert(
							'Drop Series',
							'This series will no longer appear in on-deck suggestions. You can un-drop it at any time',
							[
								{ text: t('common.cancel'), style: 'cancel' },
								{ text: 'Drop', style: 'destructive', onPress: () => dropSeries({ id: seriesId }) },
							],
						),
				})
			}
		}

		if (checkPermission(UserPermission.ScanLibrary)) {
			result.push({
				key: 'scan',
				label: 'Scan Series',
				icon: { ios: 'document.viewfinder', android: ScanLine },
				onPress: () => scanSeries({ id: seriesId }),
			})
		}

		if (checkPermission(UserPermission.DownloadFile)) {
			result.push({
				key: 'download',
				label: 'Download Series',
				icon: { ios: 'arrow.down.circle', android: DownloadCloud },
				onPress: () => {
					Alert.alert(
						'Download Series',
						'Are you sure you want to enqueue the download for this entire series?',
						[
							{ text: t('common.cancel'), style: 'cancel' },
							{ text: t('common.download'), onPress: additionalActions.onDownloadSeries },
						],
					)
				},
			})
		}

		return result
	}, [
		additionalActions,
		checkPermission,
		currentReadthrough,
		lastReadAt,
		dropSeries,
		resumeReread,
		scanSeries,
		seriesId,
		stopReread,
		undropSeries,
		seriesState,
		stats,
		t,
	]) // jfc

	const sortMenu = useSeriesBooksSortAndDisplayMenu({
		layoutKey,
		actions,
	})
	const filterMenu = useBooksFilterMenu({ libraryType: false })

	const menuFragment = useEntityListHeader({
		filterMenu,
		sortMenu,
	})

	return (
		<>
			{menuFragment}
			<MiniEntityStatCards stats={stats} />
		</>
	)
}
