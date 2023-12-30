import { useLibraries } from '@stump/client'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'

import ContinueReadingMedia from './ContinueReading'
import NoLibraries from './NoLibraries'
import RecentlyAddedMedia from './RecentlyAddedMedia'
import RecentlyAddedSeries from './RecentlyAddedSeries'

// TODO: account for new accounts, i.e. no media at all
export default function HomeScene() {
	const { libraries, isLoading } = useLibraries()

	const helmet = (
		<Helmet>
			{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
			<title>Stump | {'Home'}</title>
		</Helmet>
	)

	if (isLoading) {
		return <></>
	}

	if (!libraries?.length) {
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
		</SceneContainer>
	)
}
