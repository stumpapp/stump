import { queryClient, useScanLibrary, useUserStore } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import type { Library, LibraryScanMode } from '@stump/types'
import {
	Edit,
	FileScan,
	FolderSearch2,
	MoreVertical,
	ScanFace,
	ScanLine,
	Trash,
} from 'lucide-react'

interface Props {
	library: Library
}

export default function LibraryOptionsMenu({ library }: Props) {
	const user = useUserStore((store) => store.user)

	const { scanAsync } = useScanLibrary()

	function handleScan(mode: LibraryScanMode) {
		// extra protection, should not be possible to reach this.
		if (user?.role !== 'SERVER_OWNER') {
			throw new Error('You do not have permission to scan libraries.')
		}

		// The UI will receive updates from SSE in fractions of ms lol and it can get bogged down.
		// So, add a slight delay so the close animation of the menu can finish cleanly.
		setTimeout(async () => {
			await scanAsync({ id: library.id, mode })
			await queryClient.invalidateQueries(['getJobReports'])
		}, 50)
	}

	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<DropdownMenu
			trigger={
				<IconButton variant="ghost" rounded="full" size="xs">
					<MoreVertical className="h-4 w-4" />
				</IconButton>
			}
			groups={[
				{
					items: [
						{
							label: 'Scan Library',
							leftIcon: <FileScan className={iconStyle} />,
							subItems: [
								{
									label: 'Batched Scan',
									leftIcon: <ScanFace className={iconStyle} />,
									onClick: () => handleScan('BATCHED'),
								},
								{
									label: 'Synchronous Scan',
									leftIcon: <ScanLine className={iconStyle} />,
									onClick: () => handleScan('SYNC'),
								},
							],
						},
						{
							href: `/libraries/${library.id}/explorer`,
							label: 'File Explorer',
							leftIcon: <FolderSearch2 className={iconStyle} />,
						},
					],
				},
				{
					items: [
						{
							href: `/libraries/${library.id}/edit`,
							label: 'Edit Library',
							leftIcon: <Edit className={iconStyle} />,
						},
						{
							label: 'Delete Library',
							leftIcon: <Trash className={iconStyle} />,
							onClick: () => alert('TODO'),
						},
					],
				},
			]}
			align="start"
		/>
	)

	// // FIXME: so, disabled on the MenuItem doesn't seem to actually work... how cute.
	// return (
	// 	// TODO: https://chakra-ui.com/docs/theming/customize-theme#customizing-component-styles
	// 	<div>
	// 		<Menu size="sm">
	// 			<MenuButton
	// 				disabled={user?.role !== 'SERVER_OWNER'}
	// 				hidden={user?.role !== 'SERVER_OWNER'}
	// 				p={1}
	// 				rounded="full"
	// 				_hover={{ _dark: { bg: 'gray.700' }, bg: 'gray.200' }}
	// 				_focus={{
	// 					boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
	// 				}}
	// 				_active={{
	// 					boxShadow: '0 0 0 2px rgba(196, 130, 89, 0.6);',
	// 				}}
	// 			>
	// 				{/* <DotsThreeVertical size={'1.25rem'} /> */}
	// 			</MenuButton>

	// 			<MenuList>
	// 				{/* TODO: scanMode */}
	// 				<MenuItem
	// 					disabled={user?.role !== 'SERVER_OWNER'}
	// 					// icon={<ArrowsClockwise size={'1rem'} />}
	// 					onClick={handleScan}
	// 				>
	// 					Scan
	// 				</MenuItem>
	// 				<EditLibraryModal library={library} disabled={user?.role !== 'SERVER_OWNER'} />
	// 				<MenuItem
	// 					// icon={<Binoculars size={'1rem'} />}
	// 					onClick={() => navigate(`libraries/${library.id}/explorer`)}
	// 				>
	// 					File Explorer
	// 				</MenuItem>
	// 				<MenuDivider />
	// 				<DeleteLibraryModal library={library} disabled={user?.role !== 'SERVER_OWNER'} />
	// 			</MenuList>
	// 		</Menu>
	// 	</div>
	// )
}
