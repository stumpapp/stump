import { queryClient, useScanLibrary, useUserStore } from '@stump/client'
import { DropdownMenu } from '@stump/components'
import type { Library } from '@stump/types'
import { Edit, FolderSearch2, MoreHorizontal, ScanLine, Trash } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router'

import { useAppContext } from '../../../../context'
import { useLocaleContext } from '../../../../i18n'
import paths from '../../../../paths'
import DeleteLibraryConfirmation from '../../../library/DeleteLibraryConfirmation'

type Props = {
	library: Library
}

const LOCALE_KEY = 'sidebar.libraryOptions'
const getLocaleKey = (path: string) => `${LOCALE_KEY}.${path}`

// TODO: just split this into two components: one for desktop and one for inline
// dropdown menu.. this is gross otherwise.
export default function LibraryOptionsMenu({ library }: Props) {
	const [isDeleting, setIsDeleting] = useState(false)
	const { scanAsync } = useScanLibrary()

	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()

	const checkUserPermission = useUserStore((state) => state.checkUserPermission)

	const location = useLocation()
	const isOnExplorer = location.pathname.startsWith(paths.libraryFileExplorer(library.id))

	const canScan = useMemo(() => checkUserPermission('library:scan'), [checkUserPermission])
	const canUseExplorer = useMemo(() => checkUserPermission('file:explorer'), [checkUserPermission])

	const handleScan = useCallback(() => {
		// extra protection, should not be possible to reach this.
		if (!canScan) {
			throw new Error('You do not have permission to scan libraries.')
		}

		// The UI will receive updates from SSE in fractions of ms lol and it can get bogged down.
		// So, add a slight delay so the close animation of the menu can finish cleanly.
		setTimeout(async () => {
			await scanAsync({ id: library.id, mode: 'DEFAULT' })
			await queryClient.invalidateQueries(['getJobReports'])
		}, 50)
	}, [canScan, library.id, scanAsync])

	const iconStyle = 'mr-2 h-4 w-4'

	// TODO: other permissions!
	if (!canScan && !canUseExplorer) return null

	return (
		<>
			<DeleteLibraryConfirmation
				isOpen={isDeleting}
				onClose={() => setIsDeleting(false)}
				libraryId={library.id}
			/>
			<DropdownMenu
				trigger={
					<button className="p-1 text-gray-700 text-opacity-30 outline-none hover:text-opacity-100 focus:ring-0 focus:ring-offset-0 dark:text-gray-200 dark:text-opacity-30 dark:hover:text-opacity-100">
						<MoreHorizontal className="h-4 w-4 shrink-0" />
					</button>
				}
				groups={[
					{
						items: [
							...(canScan
								? [
										{
											label: t(getLocaleKey('scanLibrary')),
											leftIcon: <ScanLine className={iconStyle} />,
											onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
												e.stopPropagation()
												handleScan()
											},
										},
								  ]
								: []),
							...(canUseExplorer
								? [
										{
											disabled: isOnExplorer,
											href: paths.libraryFileExplorer(library.id),
											label: t(getLocaleKey('fileExplorer')),
											leftIcon: <FolderSearch2 className={iconStyle} />,
										},
								  ]
								: []),
						],
					},
					...(isServerOwner
						? [
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
											onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
												e.stopPropagation()
												setIsDeleting(true)
											},
										},
									],
								},
						  ]
						: []),
				]}
				align="start"
			/>
		</>
	)
}
