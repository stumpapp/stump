import { queryClient, useScanLibrary } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import type { Library } from '@stump/types'
import { Edit, FolderSearch2, MoreVertical, ScanLine, Trash } from 'lucide-react'
import { useState } from 'react'

import { useAppContext } from '../../context'
import { useLocaleContext } from '../../i18n'
import paths from '../../paths'
import DeleteLibraryConfirmation from '../library/DeleteLibraryConfirmation'

type Props = {
	library: Library
}

const LOCALE_KEY = 'sidebar.libraryOptions'
const getLocaleKey = (path: string) => `${LOCALE_KEY}.${path}`

export default function LibraryOptionsMenu({ library }: Props) {
	const [isDeleting, setIsDeleting] = useState(false)
	const { scanAsync } = useScanLibrary()
	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()

	function handleScan() {
		// extra protection, should not be possible to reach this.
		if (!isServerOwner) {
			throw new Error('You do not have permission to scan libraries.')
		}

		// The UI will receive updates from SSE in fractions of ms lol and it can get bogged down.
		// So, add a slight delay so the close animation of the menu can finish cleanly.
		setTimeout(async () => {
			await scanAsync({ id: library.id, mode: 'DEFAULT' })
			await queryClient.invalidateQueries(['getJobReports'])
		}, 50)
	}

	const iconStyle = 'mr-2 h-4 w-4'

	if (!isServerOwner) return null

	return (
		<>
			<DeleteLibraryConfirmation
				isOpen={isDeleting}
				onClose={() => setIsDeleting(false)}
				libraryId={library.id}
			/>
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
								label: t(getLocaleKey('scanLibrary')),
								leftIcon: <ScanLine className={iconStyle} />,
								onClick: () => handleScan(),
							},
							{
								href: paths.libraryFileExplorer(library.id),
								label: t(getLocaleKey('fileExplorer')),
								leftIcon: <FolderSearch2 className={iconStyle} />,
							},
						],
					},
					{
						items: [
							{
								href: paths.libraryManage(library.id),
								label: t(getLocaleKey('manageLibrary')),
								leftIcon: <Edit className={iconStyle} />,
							},
							{
								label: t(getLocaleKey('deleteLibrary')),
								leftIcon: <Trash className={iconStyle} />,
								onClick: () => setIsDeleting(true),
							},
						],
					},
				]}
				align="start"
			/>
		</>
	)
}
