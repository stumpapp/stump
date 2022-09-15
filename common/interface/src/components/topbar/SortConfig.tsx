import { SortAscending, SortDescending } from 'phosphor-react';
import { useState } from 'react';

import {
	ButtonGroup,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	useColorModeValue,
} from '@chakra-ui/react';
import Button from '../../ui/Button';
import { useQueryParamStore } from '@stump/client';

export default function SortConfig() {
	const { orderBy, setOrderBy, direction, setDirection } = useQueryParamStore();

	return (
		<ButtonGroup isAttached>
			<Menu>
				<MenuButton
					as={Button}
					py={0.5}
					px={2.5}
					size="sm"
					bg={useColorModeValue('gray.150', 'whiteAlpha.200')}
				>
					Order by
				</MenuButton>
				<MenuList>
					<MenuItem>Option 1</MenuItem>
					<MenuItem>Option 2</MenuItem>
					<MenuItem>Option 3</MenuItem>
					<MenuItem>Option 4</MenuItem>
				</MenuList>
			</Menu>

			<Button
				title={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
				onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}
				p={0.5}
				size="sm"
				bg={useColorModeValue('gray.150', 'whiteAlpha.200')}
			>
				{direction === 'asc' ? (
					<SortAscending className="text-lg" weight="regular" />
				) : (
					<SortDescending className="text-lg" weight="regular" />
				)}
			</Button>
		</ButtonGroup>
	);
}
