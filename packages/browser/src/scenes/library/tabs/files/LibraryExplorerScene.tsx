import { useUploadConfig } from '@stump/client'

import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'
import { useAppContext } from '@/context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()
	const { checkPermission } = useAppContext()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission('file:upload') })

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={library.path} uploadConfig={uploadConfig} />
		</div>
	)
}
