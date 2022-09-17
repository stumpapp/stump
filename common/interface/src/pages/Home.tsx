import { Box } from '@chakra-ui/react';
import { Helmet } from 'react-helmet';
import { useLibraries } from '@stump/client';
import LibrariesStats from '../components/library/LibrariesStats';
import NoLibraries from '../components/library/NoLibraries';
// import { useDidMount } from 'rooks';

// TODO: account for new accounts, i.e. no media at all
export default function Home() {
	const { libraries, isLoading } = useLibraries();

	// const { setBackwardsUrl } = useTopBarStore();

	// FIXME: NO
	// useDidMount(() => {
	// setBackwardsUrl(0);
	// });

	const helmet = (
		<Helmet>
			{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
			<title>Stump | {'Home'}</title>
		</Helmet>
	);

	if (isLoading) {
		return null;
	}

	if (!libraries?.length) {
		return (
			<>
				{helmet}
				<NoLibraries />
			</>
		);
	}

	return (
		<>
			{helmet}
			<Box p="4" w="full" h="full">
				{/* <UiDemo /> */}
				{/* <EpubReader /> */}
				<LibrariesStats />
			</Box>
		</>
	);
}
