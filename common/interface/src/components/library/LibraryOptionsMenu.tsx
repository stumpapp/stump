import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from '@chakra-ui/react';
import { ArrowsClockwise, Binoculars, DotsThreeVertical } from 'phosphor-react';
import EditLibraryModal from './EditLibraryModal';
import DeleteLibraryModal from './DeleteLibraryModal';
import { Library } from '@stump/core';
import { useNavigate } from 'react-router-dom';
import { queryClient, useScanLibrary, useUserStore } from '@stump/client';

interface Props {
	library: Library;
}

export default function LibraryOptionsMenu({ library }: Props) {
	const navigate = useNavigate();

	const { user } = useUserStore();

	const { scan } = useScanLibrary();

	function handleScan() {
		// extra protection, should not be possible to reach this.
		if (user?.role !== 'SERVER_OWNER') {
			throw new Error('You do not have permission to scan libraries.');
		}

		scan(library.id);

		queryClient.invalidateQueries(['getJobReports']);

		// Note: not worrying about this for a while so
		// if (RESTRICTED_MODE) {
		// 	restrictedToast();
		// } else {
		// 	scan(library.id);
		// }
	}

	// FIXME: so, disabled on the MenuItem doesn't seem to actually work... how cute.
	return (
		// TODO: https://chakra-ui.com/docs/theming/customize-theme#customizing-component-styles
		<Menu size="sm">
			<MenuButton
				disabled={user?.role !== 'SERVER_OWNER'}
				hidden={user?.role !== 'SERVER_OWNER'}
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
				{/* TODO: scanMode */}
				<MenuItem
					disabled={user?.role !== 'SERVER_OWNER'}
					icon={<ArrowsClockwise size={'1rem'} />}
					onClick={handleScan}
				>
					Scan
				</MenuItem>
				<EditLibraryModal library={library} disabled={user?.role !== 'SERVER_OWNER'} />
				<MenuItem
					icon={<Binoculars size={'1rem'} />}
					onClick={() => navigate(`libraries/${library.id}/explorer`)}
				>
					File Explorer
				</MenuItem>
				<MenuDivider />
				<DeleteLibraryModal library={library} disabled={user?.role !== 'SERVER_OWNER'} />
			</MenuList>
		</Menu>
	);
}
