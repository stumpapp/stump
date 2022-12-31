import { Box, Heading, HStack, useColorModeValue } from '@chakra-ui/react'
import { LayoutEntity, useTopBarStore } from '@stump/client'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import MobileDrawer from '../sidebar/MobileDrawer'
import LayoutModeButtons from './LayoutModeButtons'
import QueryConfig from './query-options/QueryConfig'

// FIXME: this is not good AT ALL for mobile. It *looks* fine, but the navigation is gone, the
// sort/view mode buttons are gone, the sort config is gone,and the search bar is meh. I need to
// plan out the layout for mobile.
export default function TopBar() {
	const { title } = useTopBarStore()
	const location = useLocation()

	const { entity, showQueryParamOptions } = useMemo(() => {
		const match =
			location.pathname.match(/\/libraries\/.+$/) || location.pathname.match(/\/series\/.+$/)

		let _entity: LayoutEntity = 'SERIES'

		// TODO: what if not either of these?
		if (location.pathname.startsWith('/libraries')) {
			_entity = 'LIBRARY'
		}

		return {
			entity: _entity,
			showQueryParamOptions: !!match,
		}
	}, [location])

	return (
		<Box
			as="header"
			className="sticky top-0 w-full px-4 py-2 md:py-3 z-10"
			bg={{
				base: useColorModeValue('white', 'gray.800'),
				md: useColorModeValue('gray.75', 'gray.900'),
			}}
		>
			<HStack w="full" justify="space-between" align="center" spacing="2">
				<HStack minH={10}>
					<MobileDrawer />
					{/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
					{/* @ts-ignore: TODO: this seems to work, idky it has type error */}
					<Heading as="h3" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1}>
						{title}
					</Heading>
				</HStack>

				{showQueryParamOptions && (
					<HStack>
						<LayoutModeButtons entity={entity} />
						<QueryConfig />
						{/* <OrderByConfig /> */}
					</HStack>
				)}
			</HStack>
		</Box>
	)
}
