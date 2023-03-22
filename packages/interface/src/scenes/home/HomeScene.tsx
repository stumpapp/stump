import { useLibraries } from '@stump/client'
import { Helmet } from 'react-helmet'

import LibrariesStats from '../../components/library/LibrariesStats'
import SceneContainer from '../../components/SceneContainer'
import ContinueReadingMedia from './ContinueReading'
import NoLibraries from './NoLibraries'
import RecentlyAddedMedia from './RecentlyAddedMedia'
import RecentlyAddedSeries from './RecentlyAddedSeries'

// TODO: account for new accounts, i.e. no media at all
export default function HomeScene() {
	return <div className="flex">HOME!</div>

	// const { libraries, isLoading } = useLibraries()

	// const helmet = (
	// 	<Helmet>
	// 		{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
	// 		<title>Stump | {'Home'}</title>
	// 	</Helmet>
	// )

	// if (isLoading) {
	// 	return <></>
	// }

	// if (!libraries?.length) {
	// 	return (
	// 		<>
	// 			{helmet}
	// 			<NoLibraries />
	// 		</>
	// 	)
	// }

	// return (
	// 	<SceneContainer className="flex flex-col gap-4">
	// 		{helmet}
	// 		<LibrariesStats />
	// 		<ContinueReadingMedia />
	// 		<RecentlyAddedMedia />
	// 		<RecentlyAddedSeries />
	// 	</SceneContainer>
	// )
}
