import React from 'react';
import { Box, Heading, HStack, useColorModeValue } from '@chakra-ui/react';
import Search from './Search';
import { useStore } from '~store/store';
import { useViewMode } from '~hooks/useViewMode';
import shallow from 'zustand/shallow';
import MobileDrawer from '../Sidebar/MobileDrawer';
import SortConfig from './SortConfig';
import ViewModeConfig from './ViewModeConfig';
import Navigation from './Navigation';

// FIXME: this is not good AT ALL for mobile. It *looks* fine, but the navigation is gone, the
// sort/view mode buttons are gone, the sort config is gone,and the search bar is meh. I need to
// plan out the layout for mobile.
export default function Topbar() {
	const title = useStore((state) => state.title, shallow);

	const { showViewOptions, viewAsGrid, onViewModeChange } = useViewMode();

	// const truncatedTitle = useMemo(() => {
	// 	if (title.length <= 20) {
	// 		return title;
	// 	}

	// 	return `${title.substring(0, 20)}...`;
	// }, [title]);

	// TODO: fix this
	return (
		<Box
			as="nav"
			className="sticky top-0 grid grid-cols-12 w-full items-center px-4 py-2 md:py-3 z-10"
			bg={{
				base: useColorModeValue('white', 'gray.800'),
				md: useColorModeValue('gray.75', 'gray.900'),
			}}
		>
			<HStack
				spacing="2"
				className="flex col-span-6 md:col-span-3 justify-start items-center self-center"
			>
				<MobileDrawer />

				<Navigation />

				{/* @ts-ignore: this seems to work, idky it has type error */}
				<Heading as="h3" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1}>
					{title}
				</Heading>
			</HStack>

			<div className="flex w-full col-span-6 justify-end items-center md:justify-center">
				<Search />
			</div>

			<div className="md:flex md:col-span-3 items-center justify-end hidden">
				{showViewOptions && (
					<>
						<HStack>
							{/* @ts-ignore */}
							<ViewModeConfig viewAsGrid={viewAsGrid!} onChange={onViewModeChange!} />

							<SortConfig />
						</HStack>
					</>
				)}
			</div>
		</Box>
	);
}
