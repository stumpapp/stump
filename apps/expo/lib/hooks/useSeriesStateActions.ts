import { useGraphQLMutation } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { isAfter } from 'date-fns'
import { BookX } from 'lucide-react-native'

import { ActionDef } from '~/components/filter/types'
import { SystemAlert } from '~/components/ui/system-alert'

import { useTranslate } from './useTranslate'

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
		resolvedName
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
	const { t } = useTranslate()
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
	const { resolvedName: seriesName } = useFragment(SeriesReadingState, fragment)

	// i decided to add confirms for them all since it kinda acts like a form
	// of documentation for what they do. maybe i'll change this if folks
	// using it find it annoying, but feels safer for now. i know not
	// everyone reads the docs so lol

	const dropWithConfirm = () =>
		SystemAlert.alert(
			t('seriesActions.dropSeries.label'),
			t('seriesActions.dropSeries.description', { seriesName }),
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: t('seriesActions.dropSeries.drop'), style: 'destructive', onPress: dropSeries },
			],
		)

	const undropWithConfirm = () =>
		SystemAlert.alert(
			t('seriesActions.undropSeries.label'),
			t('seriesActions.undropSeries.description', { seriesName }),
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: t('seriesActions.undropSeries.undrop'), onPress: undropSeries },
			],
		)

	const stopRereadWithConfirm = () =>
		SystemAlert.alert(
			t('seriesActions.stopReread.label'),
			t('seriesActions.stopReread.description', { seriesName }),
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: t('seriesActions.stopReread.stop'), onPress: stopReread },
			],
		)

	const resumeRereadWithConfirm = () =>
		SystemAlert.alert(
			t('seriesActions.resumeReread.label'),
			t('seriesActions.resumeReread.description', { seriesName }),
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: t('seriesActions.resumeReread.resume'), onPress: resumeReread },
			],
		)

	const items: ActionDef[] = [
		...(canUndrop
			? [
					{
						key: 'undrop',
						label: t('seriesActions.undropSeries.label'),
						icon: { ios: 'arrow.uturn.up.circle', android: BookX },
						onPress: undropWithConfirm,
					} satisfies ActionDef,
				]
			: []),
		...(canStopReread
			? [
					{
						key: 'stop-reread',
						label: t('seriesActions.stopReread.label'),
						icon: { ios: 'pause.circle', android: BookX },
						onPress: stopRereadWithConfirm,
					} satisfies ActionDef,
				]
			: []),
		...(canResumeReread
			? [
					{
						key: 'resume-reread',
						label: t('seriesActions.resumeReread.label'),
						icon: { ios: 'play.circle', android: BookX },
						onPress: resumeRereadWithConfirm,
					} satisfies ActionDef,
				]
			: []),
		...(canDrop
			? [
					{
						key: 'drop',
						label: t('seriesActions.dropSeries.label'),
						icon: { ios: 'xmark.circle', android: BookX },
						onPress: dropWithConfirm,
						destructive: true,
					} satisfies ActionDef,
				]
			: []),
	]

	return items
}
