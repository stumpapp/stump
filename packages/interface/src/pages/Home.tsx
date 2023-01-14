import { Stack } from '@chakra-ui/react'
import { useLibraries } from '@stump/client'
import { Helmet } from 'react-helmet'

import LibrariesStats from '../components/library/LibrariesStats'
import NoLibraries from '../components/library/NoLibraries'
import ContinueReadingMedia from '../components/media/ContinueReading'
import RecentlyAddedMedia from '../components/media/RecentlyAddedMedia'
import RecentlyAddedSeries from '../components/series/RecentlyAddedSeries'

// TODO: account for new accounts, i.e. no media at all
export default function Home() {
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
		<>
			{helmet}
			<Stack p="4" w="full" h="full" spacing={4}>
				<LibrariesStats />
				<ContinueReadingMedia />
				<RecentlyAddedMedia />
				<RecentlyAddedSeries />
			</Stack>
		</>
	)
}
