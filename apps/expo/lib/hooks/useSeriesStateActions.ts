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
			rereadStoppedAt
			backloggedAt
			dnfAt
		}
		lastReadAt
		currentReadthrough
		resolvedName
	}
`)
export type SeriesReadingStateFragmentType = FragmentType<typeof SeriesReadingState>

const backlogMutation = graphql(`
	mutation SeriesActionBacklogSeries($id: ID!) {
		backlogSeries(id: $id) {
			backloggedAt
		}
	}
`)

const unbacklogMutation = graphql(`
	mutation SeriesActionUnbacklogSeries($id: ID!) {
		unbacklogSeries(id: $id) {
			backloggedAt
		}
	}
`)

const stopRereadMutation = graphql(`
	mutation SeriesActionStopReread($id: ID!) {
		stopSeriesReread(id: $id) {
			rereadStoppedAt
		}
	}
`)

const resumeRereadMutation = graphql(`
	mutation SeriesActionResumeReread($id: ID!) {
		resumeSeriesReread(id: $id) {
			rereadStoppedAt
		}
	}
`)

type Params = {
	fragment: FragmentType<typeof SeriesReadingState>
	onSuccess?: () => void
}

type Return = {
	backlogSeries: () => void
	canBacklog: boolean
	unbacklogSeries: () => void
	canUnbacklog: boolean
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
	} = useFragment(SeriesReadingState, fragment)

	const { mutate: backlogSeries } = useGraphQLMutation(backlogMutation, options)
	const { mutate: unbacklogSeries } = useGraphQLMutation(unbacklogMutation, options)
	const { mutate: stopReread } = useGraphQLMutation(stopRereadMutation, options)
	const { mutate: resumeReread } = useGraphQLMutation(resumeRereadMutation, options)

	const isBacklogged = !!seriesState?.backloggedAt
	const isRereading = (currentReadthrough ?? 0) > 1

	const stoppedAt = seriesState?.rereadStoppedAt
	const isReadthroughStopped = lastReadAt && stoppedAt ? isAfter(lastReadAt, stoppedAt) : false

	return {
		backlogSeries: () => backlogSeries({ id: seriesId }),
		canBacklog: !isBacklogged,
		unbacklogSeries: () => unbacklogSeries({ id: seriesId }),
		canUnbacklog: isBacklogged,
		stopReread: () => stopReread({ id: seriesId }),
		canStopReread: !isBacklogged && isRereading && !isReadthroughStopped,
		resumeReread: () => resumeReread({ id: seriesId }),
		canResumeReread: !isBacklogged && isReadthroughStopped,
	}
}

export function useSeriesStateMenu({ fragment, ...options }: Params) {
	const { t } = useTranslate()
	const {
		backlogSeries,
		canBacklog,
		unbacklogSeries,
		canUnbacklog,
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

	const backlogWithConfirmation = () =>
		SystemAlert.alert(
			t('seriesActions.backlogSeries.label'),
			t('seriesActions.backlogSeries.description', { seriesName }),
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: t('seriesActions.backlog'), style: 'destructive', onPress: backlogSeries },
			],
		)

	const unbacklogWithConfirmation = () =>
		SystemAlert.alert(
			t('seriesActions.unbacklogSeries.label'),
			t('seriesActions.unbacklogSeries.description', { seriesName }),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('seriesActions.unbacklog'), onPress: unbacklogSeries },
			],
		)

	const stopRereadWithConfirm = () =>
		SystemAlert.alert(
			t('seriesActions.stopReread.label'),
			t('seriesActions.stopReread.description', { seriesName }),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('seriesActions.stop'), onPress: stopReread },
			],
		)

	const resumeRereadWithConfirm = () =>
		SystemAlert.alert(
			t('seriesActions.resumeReread.label'),
			t('seriesActions.resumeReread.description', { seriesName }),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('seriesActions.resume'), onPress: resumeReread },
			],
		)

	const items: ActionDef[] = [
		...(canUnbacklog
			? [
					{
						key: 'unbacklog',
						label: t('seriesActions.unbacklogSeries.label'),
						icon: { ios: 'arrow.uturn.up.circle', android: BookX },
						onPress: unbacklogWithConfirmation,
					} satisfies ActionDef,
				]
			: []),
		...(canStopReread
			? [
					{
						key: 'stop-reread',
						label: t('seriesActions.pauseReread.label'),
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
		...(canBacklog
			? [
					{
						key: 'pause',
						label: t('seriesActions.backlogSeries.label'),
						icon: { ios: 'xmark.circle', android: BookX },
						onPress: backlogWithConfirmation,
						destructive: true,
					} satisfies ActionDef,
				]
			: []),
	]

	return items
}
