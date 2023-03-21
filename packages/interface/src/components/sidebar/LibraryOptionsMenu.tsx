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
									label: 'Parallel Scan',
									leftIcon: <ScanFace className={iconStyle} />,
									onClick: () => handleScan('BATCHED'),
								},
								{
									label: 'In-Order Scan',
									leftIcon: <ScanLine className={iconStyle} />,
									onClick: () => handleScan('SYNC'),
								},
							],
						},
						{
							href: `/library/${library.id}/explore`,
							label: 'File Explorer',
							leftIcon: <FolderSearch2 className={iconStyle} />,
						},
					],
				},
				{
					items: [
						{
							href: `/library/${library.id}/edit`,
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
}
