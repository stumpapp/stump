import { SortAscending, SortDescending } from 'phosphor-react';

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

export default function OrderDirectionToggle() {
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
				title={
					direction === 'desc' ? 'Change ordering to ascending' : 'Change ordering to descending'
				}
				onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}
				p={0.5}
				size="sm"
				bg={useColorModeValue('gray.150', 'whiteAlpha.200')}
			>
				{direction === 'desc' ? (
					<SortAscending className="text-lg" weight="regular" />
				) : (
					<SortDescending className="text-lg" weight="regular" />
				)}
			</Button>
		</ButtonGroup>
	);
}
