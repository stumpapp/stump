import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import shallow from 'zustand/shallow';
import KeepReading from '~components/home/KeepReading';
import { useStore } from '~store/store';
import toast from 'react-hot-toast';

// TODO: account for new accounts, i.e. no media at all
export default function Home() {
	const media = useStore(({ media }) => media, shallow);

	const keepReading = media.filter((m) => m.currentPage && m.currentPage < m.pages).slice(0, 5);

	const testLoadingToast = () =>
		new Promise((resolve) => {
			setTimeout(() => resolve('Hey...'), 5000);
		});

	return (
		<Box rounded="md">
			<KeepReading media={keepReading} />
			<Button onClick={() => toast('Just a message')}>Notify info</Button>
			<Button onClick={() => toast.error('Something bad happened')}>Notify error</Button>
			<Button
				onClick={() => {
					toast.promise(testLoadingToast(), {
						loading: 'Loading',
						success: 'Got the data',
						error: 'Error when fetching',
					});
				}}
			>
				Notify loading
			</Button>
		</Box>
	);
}
