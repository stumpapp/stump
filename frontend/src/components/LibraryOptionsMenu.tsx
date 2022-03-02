import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from '@chakra-ui/react';
import { ArrowsClockwise, DotsThreeVertical, NotePencil, Trash } from 'phosphor-react';
import React from 'react';

export default function LibraryOptionsMenu() {
	return (
		// TODO: https://chakra-ui.com/docs/theming/customize-theme#customizing-component-styles
		<Menu size="sm">
			<MenuButton p={1} rounded="full" _hover={{ bg: 'gray.200', _dark: { bg: 'gray.700' } }}>
				<DotsThreeVertical size={'1.25rem'} />
			</MenuButton>

			<MenuList>
				<MenuItem icon={<ArrowsClockwise size={'1rem'} />}>Scan</MenuItem>
				<MenuItem icon={<NotePencil size={'1rem'} />}>Edit</MenuItem>
				<MenuDivider />
				<MenuItem icon={<Trash size={'1rem'} />}>Delete</MenuItem>
			</MenuList>
		</Menu>
	);
}
