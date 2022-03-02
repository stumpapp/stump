import { Box, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { Outlet } from 'react-router-dom';
import Lazy from '~components/Lazy';

interface Props {
	children?: React.ReactNode;
}

export default function BaseLayout({ children }: Props) {
	const content = children ?? <Outlet />;

	return (
		<Box h="full" bg={useColorModeValue('gray.100', 'gray.900')} as="main">
			<React.Suspense fallback={<Lazy />}>{content}</React.Suspense>
		</Box>
	);
}
