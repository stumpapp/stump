import { useSuspenseQuery } from '@apollo/client'
import { graphql } from '@stump/graphql'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'

import ContinueReadingMedia from './ContinueReading'
import NoLibraries from './NoLibraries'
import RecentlyAddedMedia from './RecentlyAddedMedia'
import RecentlyAddedSeries from './RecentlyAddedSeries'

const query = graphql(`
	query HomeSceneQuery {
		numberOfLibraries
	}
`)

// TODO: account for new accounts, i.e. no media at all
export default function HomeScene() {
	const {
		data: { numberOfLibraries },
	} = useSuspenseQuery(query)

	const helmet = (
		<Helmet>
			{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
			<title>Stump | {'Home'}</title>
		</Helmet>
	)

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
