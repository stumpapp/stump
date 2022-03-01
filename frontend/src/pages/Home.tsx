import { Box } from '@chakra-ui/react';
import React from 'react';
import shallow from 'zustand/shallow';
import KeepReading from '~components/home/KeepReading';
import { useMainStore } from '~store/mainStore';

export default function Home() {
	const media = useMainStore(({ media }) => media, shallow);

	const keepReading = media.filter((m) => m.current_page && m.current_page < m.pages).slice(0, 5);

	return (
		<Box rounded="md">
			<KeepReading media={keepReading} />
		</Box>
	);
}
