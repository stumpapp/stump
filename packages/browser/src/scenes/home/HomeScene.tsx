import { useGraphQLSubscription, useSDK, useSuspenseGraphQL } from '@stump/client'
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

const sub = graphql(`
	subscription HomeSceneSubscription {
		tailLogFile
	}
`)

// TODO: account for new accounts, i.e. no media at all
export default function HomeScene() {
	const { sdk } = useSDK()
	const { data } = useSuspenseGraphQL(query, ['numberOfLibraries'])

	const [subData] = useGraphQLSubscription(sub)

	console.log(subData)

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

			<button onClick={() => sdk.connect(sub)}>Try sub</button>

			<ContinueReadingMedia />
			<RecentlyAddedMedia />
			<RecentlyAddedSeries />
			<div className="pb-5 sm:pb-0" />
		</SceneContainer>
	)
}
