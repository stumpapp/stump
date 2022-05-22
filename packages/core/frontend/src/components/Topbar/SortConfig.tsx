import { ButtonGroup, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { CaretDown, Rows, SortAscending, SortDescending } from 'phosphor-react';
import React, { useState } from 'react';
import Button from '~components/ui/Button';

export default function SortConfig() {
	const [fakeState, setFakeState] = useState(false);

	return (
		<ButtonGroup isAttached>
			<Menu>
				<MenuButton as={Button} py={0.5} px={2.5} size="sm">
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
