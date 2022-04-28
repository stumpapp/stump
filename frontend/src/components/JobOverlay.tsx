import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Progress, Text } from '@chakra-ui/react';

function ExampleJobSetup() {
	return (
		<>
			<Text fontWeight="medium">Library Scan</Text>
			<Progress rounded="md" w="full" size="xs" isIndeterminate colorScheme="brand" />
			<Text>Gathering job specifics</Text>
		</>
	);
}

function ExampleJob({ onFinish }: any) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const timeout = setTimeout(() => setProgress(progress + 1), 500);

		if (progress >= 100) {
			onFinish();
		}

		return () => clearTimeout(timeout);
	}, [progress]);

	return (
		<>
			<Text fontWeight="medium">Library Scan</Text>
			<Progress value={progress} rounded="md" w="full" size="xs" colorScheme="brand" />
			<Text>Scanning file {progress} of 100</Text>
		</>
	);
}

// TODO: this will pop up when someone does a job, i.e. scanning a library.
// it will show progress and other information on click.
export default function JobOverlay() {
	// const [jobs, setJobs] = React.useState([{}]);
	const [open, setOpen] = useState(true);

	const [settingUp, setSettingUp] = useState(true);

	// useEffect(() => {
	// 	let timeout = setTimeout(() => setOpen(!open), 3000);

	// 	return () => clearTimeout(timeout);
	// }, [open]);

	// TODO: remove me this is demo stuff
	useEffect(() => {
		let timeout = setTimeout(() => setSettingUp(false), 3000);

		return () => clearTimeout(timeout);
	}, []);

	return (
		<AnimatePresence>
			{open && (
				<Box
					as={motion.div}
					bg={'white'}
					_dark={{ bg: 'gray.700' }}
					className="absolute right-[1rem] bottom-[1rem] rounded-md shadow p-2 flex flex-col justify-center items-center w-52"
					initial={{ opacity: 0, y: 100, scale: 0.9 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 100, scale: 0.9 }}
				>
					<div className="flex flex-col space-y-2 p-2 w-full text-xs">
						{settingUp && <ExampleJobSetup />}
						{!settingUp && <ExampleJob onFinish={() => setOpen(false)} />}
					</div>
				</Box>
			)}
		</AnimatePresence>
	);
}
