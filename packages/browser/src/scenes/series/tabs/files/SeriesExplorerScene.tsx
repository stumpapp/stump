import { useUploadConfig } from '@stump/client'

import { FileExplorer } from '@/components/explorer'
import { useAppContext } from '@/context'

import { useSeriesContext } from '../../context'

export default function SeriesExplorerScene() {
	const {
		series: { path, library_id },
	} = useSeriesContext()
	const { checkPermission } = useAppContext()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission('file:upload') })

	return (
		<div className="flex flex-1">
			<FileExplorer libraryID={library_id} rootPath={path} uploadConfig={uploadConfig} />
		</div>
	)
}
