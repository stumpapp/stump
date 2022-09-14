import { CaretLeft, CaretRight } from 'phosphor-react';
import { useCallback } from 'react';
import { useNavigate, To } from 'react-router-dom';

import { HStack, useColorModeValue } from '@chakra-ui/react';
import { useTopBarStore } from '@stump/client';

import Button from '../../ui/Button';

export default function NavigationButtons() {
	const navigate = useNavigate();

	// FIXME: still not a perfect solution, but it works for now.
	// https://github.com/remix-run/react-router/discussions/8782
	const { backwardsUrl, forwardsUrl } = useTopBarStore();

	const navigateForward = useCallback(() => {
		if (forwardsUrl != undefined) {
			navigate(forwardsUrl as To);
		} else {
			navigate(1);
		}
	}, [forwardsUrl]);

	const navigateBackward = useCallback(() => {
		if (backwardsUrl) {
			navigate(backwardsUrl as To);
		} else {
			navigate(-1);
		}
	}, [backwardsUrl]);

	return (
		<HStack
			// >:( this won't work, probably some annoying thing with parent stack
			// ml={0}
			style={{ margin: 0 }}
			spacing={1}
			alignItems="center"
			display={{ base: 'none', md: 'flex' }}
		>
			<Button
				variant="ghost"
				p="0.5"
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={navigateBackward}
				disabled={backwardsUrl === 0}
			>
				<CaretLeft />
			</Button>

			<Button
				variant="ghost"
				p="0.5"
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={navigateForward}
				disabled={forwardsUrl === 0}
			>
				<CaretRight />
			</Button>
		</HStack>
	);
}
