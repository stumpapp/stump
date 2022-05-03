import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import shallow from 'zustand/shallow';
import KeepReading from '~components/Home/KeepReading';
import { useStore } from '~store/store';
import UiDemo from '~components/UiDemo';

// TODO: account for new accounts, i.e. no media at all
export default function Home() {
	const media = useStore(({ media }) => media, shallow);

	const keepReading = media.filter((m) => m.currentPage && m.currentPage < m.pages).slice(0, 5);

	return (
		<Box p="4">
			<UiDemo />
		</Box>
	);
}
