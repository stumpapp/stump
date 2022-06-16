import React from 'react';
import { Box } from '@chakra-ui/react';
import { Helmet } from 'react-helmet';
import NoLibraries from '~components/Home/NoLibraries';
import { useStore } from '~store/store';

// TODO: account for new accounts, i.e. no media at all
export default function Home() {
	const libraries = useStore(({ libraries }) => libraries);

	// console.log('media', media);
	//
	// const keepReading = media.filter((m) => m.currentPage && m.currentPage < m.pages).slice(0, 5);

	const helmet = (
		<Helmet>
			{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
			<title>Stump | {'Home'}</title>
		</Helmet>
	);

	if (!libraries.length) {
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
			</Box>
		</>
	);
}
