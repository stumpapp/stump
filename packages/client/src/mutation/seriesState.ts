import { FragmentType, graphql, SeriesReadingStateFragment, useFragment } from '@stump/graphql'
import { isAfter } from 'date-fns'

import { useGraphQLMutation } from '../hooks/useGraphQL'

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
	data: SeriesReadingStateFragment
}

export function useSeriesStateMutation({ fragment, ...options }: Params): Return {
	const data = useFragment(SeriesReadingState, fragment)
	const { id: seriesId, userSeriesState: seriesState, lastReadAt, currentReadthrough } = data

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
		data,
	}
}
