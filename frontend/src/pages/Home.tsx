import { Box } from '@chakra-ui/react';
import React from 'react';
import shallow from 'zustand/shallow';
import KeepReading from '~components/home/KeepReading';
import { useStore } from '~store/store';

export default function Home() {
	const media = useStore(({ media }) => media, shallow);

	const keepReading = media.filter((m) => m.currentPage && m.currentPage < m.pages).slice(0, 5);

	return (
		<Box rounded="md">
			<KeepReading media={keepReading} />
		</Box>
	);
}
