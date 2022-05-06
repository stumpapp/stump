import React from 'react';
import { Box } from '@chakra-ui/react';
import UiDemo from '~components/UiDemo';
import { Helmet } from 'react-helmet';

// TODO: account for new accounts, i.e. no media at all
export default function Home() {
	// const media = useStore(({ media }) => media, shallow);

	// const keepReading = media.filter((m) => m.currentPage && m.currentPage < m.pages).slice(0, 5);

	return (
		<>
			<Helmet>
				{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
				<title>Stump | {'Home'}</title>
			</Helmet>
			<Box p="4">
				{/* <UiDemo /> */}
				woof
			</Box>
		</>
	);
}
