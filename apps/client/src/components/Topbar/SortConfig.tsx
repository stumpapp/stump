import { SortAscending, SortDescending } from 'phosphor-react';
import { useState } from 'react';
import Button from '~ui/Button';

import {
	ButtonGroup,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	useColorModeValue,
} from '@chakra-ui/react';

interface SortConfigProps {}

export default function SortConfig() {
	const [fakeState, setFakeState] = useState(false);

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
					Sort by
				</MenuButton>
				<MenuList>
					<MenuItem>Option 1</MenuItem>
					<MenuItem>Option 2</MenuItem>
					<MenuItem>Option 3</MenuItem>
					<MenuItem>Option 4</MenuItem>
				</MenuList>
			</Menu>

			<Button
				title={fakeState ? 'Sort ascending' : 'Sort descending'}
				onClick={() => setFakeState((prev) => !prev)}
				p={0.5}
				size="sm"
				bg={useColorModeValue('gray.150', 'whiteAlpha.200')}
			>
				{fakeState ? (
					<SortAscending className="text-lg" weight="regular" />
				) : (
					<SortDescending className="text-lg" weight="regular" />
				)}
			</Button>
		</ButtonGroup>
	);
}
