import React from 'react';
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from '@chakra-ui/react';
import { ArrowsClockwise, DotsThreeVertical } from 'phosphor-react';
import { useMutation } from 'react-query';
import { scanLibary } from '~api/mutation/library';
// import { restrictedToast, RESTRICTED_MODE } from '~util/restricted';
import EditLibraryModal from './EditLibraryModal';
import DeleteLibraryModal from './DeleteLibraryModal';

interface Props {
	library: Library;
}

export default function LibraryOptionsMenu({ library }: Props) {
	const { mutate: scan } = useMutation('scanLibary', { mutationFn: scanLibary });

	function handleScan() {
		scan(library.id);

		// Note: not worrying about this for a while so
		// if (RESTRICTED_MODE) {
		// 	restrictedToast();
		// } else {
		// 	scan(library.id);
		// }
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
				<EditLibraryModal library={library} />
				<MenuDivider />
				<DeleteLibraryModal library={library} />
			</MenuList>
		</Menu>
	);
}
