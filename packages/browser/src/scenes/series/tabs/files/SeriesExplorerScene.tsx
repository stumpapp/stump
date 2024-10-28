import { useUploadConfig } from '@stump/client'

import { FileExplorer } from '@/components/explorer'

import { useSeriesContext } from '../../context'
import { useAppContext } from '@/context'

export default function SeriesExplorerScene() {
	const {
		series: { path },
	} = useSeriesContext()
	const { checkPermission } = useAppContext()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission('file:upload') })

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={path} uploadConfig={uploadConfig} />
		</div>
	)
}
