import { useGraphQLMutation, useSDK } from '@stump/client'
import { DropdownMenu, IconButton } from '@stump/components'
import { graphql, LibrarySideBarSectionQuery, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { FolderSearch2, MoreHorizontal, ScanLine, Settings, Trash } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { useMediaMatch } from 'rooks'

import DeleteLibraryConfirmation from '@/components/library/DeleteLibraryConfirmation'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

const mutation = graphql(`
	mutation ScanLibraryMutation($id: ID!) {
		scanLibrary(id: $id)
	}
`)

type Props = {
	library: LibrarySideBarSectionQuery['libraries']['nodes'][number]
}

const LOCALE_KEY = 'sidebar.libraryOptions'
const getLocaleKey = (path: string) => `${LOCALE_KEY}.${path}`

export default function LibraryOptionsMenu({ library }: Props) {
	const client = useQueryClient()
	const paths = usePaths()

	const [isDeleting, setIsDeleting] = useState(false)

	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()
	const { sdk } = useSDK()
	const { mutate: startScan } = useGraphQLMutation(mutation, {
		onSuccess: () => {
			client.refetchQueries({
				predicate: ({ queryKey: [baseKey] }) => baseKey === sdk.cacheKeys.jobs,
			})
		},
	})

	const isMobile = useMediaMatch('(max-width: 768px)')

	const location = useLocation()
	const isOnExplorer = location.pathname.startsWith(paths.libraryFileExplorer(library.id))

	const canScan = useMemo(() => checkPermission(UserPermission.ScanLibrary), [checkPermission])
	const canManage = useMemo(() => checkPermission(UserPermission.ManageLibrary), [checkPermission])
	const canDelete = useMemo(() => checkPermission(UserPermission.DeleteLibrary), [checkPermission])
	const canUseExplorer = useMemo(
		() => checkPermission(UserPermission.FileExplorer),
		[checkPermission],
	)

	const handleScan = useCallback(() => {
		// extra protection, should not be possible to reach this.
		if (!canScan) {
			throw new Error('You do not have permission to scan libraries.')
		}
		startScan({ id: library.id })
	}, [canScan, library.id, startScan])

	const iconStyle = 'mr-2 h-4 w-4'

	// TODO: other permissions!
	if (!canScan && !canUseExplorer) return null

	return (
		<>
			<DeleteLibraryConfirmation
				isOpen={isDeleting}
				onClose={() => setIsDeleting(false)}
				libraryId={library.id}
				libraryName={library.name}
			/>

			<DropdownMenu
				modal={isMobile}
				trigger={
					<IconButton
						variant="ghost"
						size="sm"
						className="h-7 w-7 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
					>
						<MoreHorizontal className="h-4 w-4 shrink-0" />
					</IconButton>
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
					...(canManage
						? [
								{
									items: [
										{
											href: paths.libraryManage(library.id),
											label: t(getLocaleKey('manageLibrary')),
											leftIcon: <Settings className={iconStyle} />,
										},
										...(canDelete
											? [
													{
														label: t(getLocaleKey('deleteLibrary')),
														leftIcon: <Trash className={iconStyle} />,
														onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
															e.stopPropagation()
															setIsDeleting(true)
														},
														isDestructive: true,
													},
												]
											: []),
									],
								},
							]
						: []),
				]}
				align={isMobile ? 'end' : 'start'}
			/>
		</>
	)
}
