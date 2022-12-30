import React from 'react';
import { Heading, Stack, Text } from '@chakra-ui/react';
import CreateLibraryModal from './CreateLibraryModal';

export default function NoLibraries() {
	return (
		<Stack className="flex-1 items-center justify-center" p={4}>
			<Heading size="md">You don't have any libraries configured</Heading>
			<Text fontSize="lg">
				That's okay! To get started, click{' '}
				<CreateLibraryModal
					trigger={({ onClick }) => (
						<span onClick={onClick} className="cursor-pointer text-brand">
							here
						</span>
					)}
				/>{' '}
				to add your first one.
			</Text>
		</Stack>
	);
}
