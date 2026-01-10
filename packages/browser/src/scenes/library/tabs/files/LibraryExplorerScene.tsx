import { useUploadConfig } from '@stump/client'
import { UserPermission } from '@stump/graphql'

import { FileExplorer } from '@/components/explorer'
import { useAppContext } from '@/context'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()
	const { checkPermission } = useAppContext()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission(UserPermission.UploadFile) })

	return (
		<div className="flex flex-1">
			<FileExplorer libraryID={library.id} rootPath={library.path} uploadConfig={uploadConfig} />
		</div>
	)
}
