import React from 'react';
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from '@chakra-ui/react';
import { ArrowsClockwise, DotsThreeVertical, NotePencil, Trash } from 'phosphor-react';
import { useMutation } from 'react-query';
import { scanLibary } from '~api/mutation/library';
import toast from 'react-hot-toast';
import { restrictedToast, RESTRICTED_MODE } from '~util/restricted';

interface Props {
	libraryId: string;
}

export default function LibraryOptionsMenu({ libraryId }: Props) {
	const { mutate: scan } = useMutation('scanLibary', { mutationFn: scanLibary });

	function handleScan() {
		if (RESTRICTED_MODE) {
			restrictedToast();
		} else {
			scan(libraryId);
		}
	}

	return (
		// TODO: https://chakra-ui.com/docs/theming/customize-theme#customizing-component-styles
		<Menu size="sm">
			<MenuButton
				p={1}
				rounded="full"
				_hover={{ bg: 'gray.200', _dark: { bg: 'gray.700' } }}
				_focus={{
					boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
				}}
				_active={{
					boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
				}}
			>
				<DotsThreeVertical size={'1.25rem'} />
			</MenuButton>

			<MenuList>
				<MenuItem icon={<ArrowsClockwise size={'1rem'} />} onClick={handleScan}>
					Scan
				</MenuItem>
				<MenuItem
					icon={<NotePencil size={'1rem'} />}
					onClick={() => toast.error("I can't do that yet! 😢")}
				>
					Edit
				</MenuItem>
				<MenuDivider />
				<MenuItem
					icon={<Trash size={'1rem'} />}
					onClick={() => toast.error("I can't do that yet! 😢")}
				>
					Delete
				</MenuItem>
			</MenuList>
		</Menu>
	);
}
