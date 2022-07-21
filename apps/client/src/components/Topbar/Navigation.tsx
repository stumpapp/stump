import React, { useMemo } from 'react';
import { HStack, useColorModeValue, usePrevious } from '@chakra-ui/react';
import { CaretLeft, CaretRight } from 'phosphor-react';
import { Path, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '~ui/Button';

interface Destinations {
	forward: string | Partial<Path>;
	backward: string | Partial<Path>;
}

// TODO: fix navigation, I don't necessarily want native navigation here. I want to be able to disable the
// buttons if theres is no forward/backward history. If I am on /books/id/pages/page, and I click the back button on
// that page to take me to /boos/id, I don't want the back button to go to /books/id/pages/page.
export default function Navigation() {
	const navigate = useNavigate();
	const _location = useLocation();

	// const { id } = useParams();

	// const prevId = usePrevious(id);

	// // console.log({ id, prevId });

	// // FIXME: I don't like this... honestly feels very risky and bug-prone...
	// // lol i don't think it works AT ALL... leaving here for reference...
	// const destinations: Destinations = useMemo(() => {
	// 	if (location.pathname.match(/.+\/books\/.+$/)) {
	// 		if (!prevId) {
	// 			return { backward: -1, forward: 1 } as Destinations;
	// 		}

	// 		return { backward: `/series/${prevId}`, forward: 1 } as Destinations;
	// 	}

	// 	return { backward: -1, forward: 1 } as Destinations;
	// }, [location, id, prevId]);

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
				onClick={() => navigate(-1)}
			>
				<CaretLeft />
			</Button>

			<Button
				variant="ghost"
				p="0.5"
				size="sm"
				_hover={{ bg: useColorModeValue('gray.200', 'gray.750') }}
				onClick={() => navigate(1)}
			>
				<CaretRight />
			</Button>
		</HStack>
	);
}
