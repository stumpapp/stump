import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'

import ContinueReadingMedia, { usePrefetchContinueReading } from './ContinueReading'
import NoLibraries from './NoLibraries'
import RecentlyAddedMedia, { usePrefetchRecentlyAddedMedia } from './RecentlyAddedMedia'
import RecentlyAddedSeries, { usePrefetchRecentlyAddedSeries } from './RecentlyAddedSeries'

const query = graphql(`
	query HomeSceneQuery {
		numberOfLibraries
	}
`)

export const usePrefetchHomeScene = () => {
	const prefetchRecentMedia = usePrefetchRecentlyAddedMedia()
	const prefetchContinueReading = usePrefetchContinueReading()
	const prefetchRecentSeries = usePrefetchRecentlyAddedSeries()

	return () =>
		Promise.all([prefetchRecentMedia(), prefetchContinueReading(), prefetchRecentSeries()])
}

// TODO: account for new accounts, i.e. no media at all
export default function HomeScene() {
	const { sdk } = useSDK()
	const { data } = useSuspenseGraphQL(query, sdk.cacheKey('numberOfLibraries'))

	const helmet = (
		<Helmet>
			{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
			<title>Stump | {'Home'}</title>
		</Helmet>
	)

	if (!data) {
		return null
	}

	const { numberOfLibraries } = data

	if (numberOfLibraries === 0) {
		return (
			<>
				{helmet}
				<NoLibraries />
			</>
		)
	}

	return (
		<SceneContainer className="flex flex-col gap-4">
			{helmet}

			<ContinueReadingMedia />
			<RecentlyAddedMedia />
			<RecentlyAddedSeries />
			<div className="pb-5 sm:pb-0" />
		</SceneContainer>
	)
}
