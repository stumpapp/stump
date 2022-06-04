import React from 'react';
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from '@chakra-ui/react';
import { ArrowsClockwise, DotsThreeVertical } from 'phosphor-react';
import { useMutation } from 'react-query';
import { scanLibary } from '~api/mutation/library';
import EditLibraryModal from './EditLibraryModal';
import DeleteLibraryModal from './DeleteLibraryModal';
import toast from 'react-hot-toast';
import { UserRole } from '~util/common';
import { useUser } from '~hooks/useUser';

interface Props {
	library: Library;
}

export default function LibraryOptionsMenu({ library }: Props) {
	const user = useUser();

	const { mutate: scan } = useMutation('scanLibary', { mutationFn: scanLibary });

	function handleScan() {
		// extra protection, should not be possible to reach this.
		if (user?.role !== UserRole.ServerOwner) {
			toast.error('You do not have permission to scan libraries.');
			return;
		}

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
				disabled={user?.role !== UserRole.ServerOwner}
				hidden={user?.role !== UserRole.ServerOwner}
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
				<MenuItem
					disabled={user?.role !== UserRole.ServerOwner}
					icon={<ArrowsClockwise size={'1rem'} />}
					onClick={handleScan}
				>
					Scan
				</MenuItem>
				<EditLibraryModal library={library} disabled={user?.role !== UserRole.ServerOwner} />
				<MenuDivider />
				<DeleteLibraryModal library={library} disabled={user?.role !== UserRole.ServerOwner} />
			</MenuList>
		</Menu>
	);
}
