import { useGraphQLMutation } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { isAfter } from 'date-fns'
import { BookX } from 'lucide-react-native'
import { Alert } from 'react-native'

import { ActionDef } from '~/components/filter/types'

const SeriesReadingState = graphql(`
	fragment SeriesReadingState on Series {
		id
		userSeriesState {
			stoppedReadthroughAt
			droppedAt
		}
		lastReadAt
		currentReadthrough
		stats {
			completedBooks
		}
	}
`)
export type SeriesReadingStateFragmentType = FragmentType<typeof SeriesReadingState>

const dropMutation = graphql(`
	mutation SeriesActionDropSeries($id: ID!) {
		dropSeries(id: $id) {
			droppedAt
		}
	}
`)

const undropMutation = graphql(`
	mutation SeriesActionUndropSeries($id: ID!) {
		undropSeries(id: $id) {
			droppedAt
		}
	}
`)

const stopRereadMutation = graphql(`
	mutation SeriesActionStopReread($id: ID!) {
		stopSeriesReread(id: $id) {
			stoppedReadthroughAt
		}
	}
`)

const resumeRereadMutation = graphql(`
	mutation SeriesActionResumeReread($id: ID!) {
		resumeSeriesReread(id: $id) {
			stoppedReadthroughAt
		}
	}
`)

type Params = {
	fragment: FragmentType<typeof SeriesReadingState>
	onSuccess?: () => void
}

type Return = {
	dropSeries: () => void
	canDrop: boolean
	undropSeries: () => void
	canUndrop: boolean
	stopReread: () => void
	canStopReread: boolean
	resumeReread: () => void
	canResumeReread: boolean
}

export function useSeriesStateActions({ fragment, ...options }: Params): Return {
	const {
		id: seriesId,
		userSeriesState: seriesState,
		lastReadAt,
		currentReadthrough,
		stats: { completedBooks },
	} = useFragment(SeriesReadingState, fragment)

	const { mutate: dropSeries } = useGraphQLMutation(dropMutation, options)
	const { mutate: undropSeries } = useGraphQLMutation(undropMutation, options)
	const { mutate: stopReread } = useGraphQLMutation(stopRereadMutation, options)
	const { mutate: resumeReread } = useGraphQLMutation(resumeRereadMutation, options)

	const isDropped = !!seriesState?.droppedAt
	const hasProgress = completedBooks > 0
	const isRereading = (currentReadthrough ?? 0) > 1

	const stoppedAt = seriesState?.stoppedReadthroughAt
	const isReadthroughStopped = lastReadAt && stoppedAt ? isAfter(lastReadAt, stoppedAt) : false

	return {
		dropSeries: () => dropSeries({ id: seriesId }),
		canDrop: !isDropped && hasProgress,
		undropSeries: () => undropSeries({ id: seriesId }),
		canUndrop: isDropped,
		stopReread: () => stopReread({ id: seriesId }),
		canStopReread: !isDropped && isRereading && !isReadthroughStopped,
		resumeReread: () => resumeReread({ id: seriesId }),
		canResumeReread: !isDropped && isReadthroughStopped,
	}
}

export function useSeriesStateMenu({ fragment, ...options }: Params) {
	const {
		dropSeries,
		canDrop,
		undropSeries,
		canUndrop,
		stopReread,
		canStopReread,
		resumeReread,
		canResumeReread,
	} = useSeriesStateActions({ fragment, ...options })

	const dropWithConfirm = () =>
		Alert.alert(
			'Drop Series',
			'TODO: something something drop something something description something something',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Drop', style: 'destructive', onPress: dropSeries },
			],
		)

	const undropWithConfirm = () =>
		Alert.alert(
			'Un-drop Series',
			'Are you sure you want to un-drop this series? This will make it show up in your on-deck suggestions again.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Un-drop', onPress: undropSeries },
			],
		)

	const items: ActionDef[] = [
		...(canUndrop
			? [
					{
						key: 'undrop',
						label: 'Un-drop Series',
						icon: { ios: 'arrow.uturn.up.circle', android: BookX },
						onPress: undropWithConfirm,
					} satisfies ActionDef,
				]
			: []),
		...(canStopReread
			? [
					{
						key: 'stop-reread',
						label: 'Stop Re-read',
						icon: { ios: 'pause.circle', android: BookX },
						onPress: stopReread,
					} satisfies ActionDef,
				]
			: []),
		...(canResumeReread
			? [
					{
						key: 'resume-reread',
						label: 'Resume Re-read',
						icon: { ios: 'play.circle', android: BookX },
						onPress: resumeReread,
					} satisfies ActionDef,
				]
			: []),
		...(canDrop
			? [
					{
						key: 'drop',
						label: 'Drop Series',
						icon: { ios: 'xmark.circle', android: BookX },
						onPress: dropWithConfirm,
						destructive: true,
					} satisfies ActionDef,
				]
			: []),
	]

	return items
}
