import { useUploadConfig } from '@stump/client'
import { UserPermission } from '@stump/graphql'

import { FileExplorer } from '@/components/explorer'
import { useAppContext } from '@/context'

import { useSeriesContext } from '../../context'

export default function SeriesExplorerScene() {
	const {
		series: {
			path,
			library: { id: libraryId },
		},
	} = useSeriesContext()
	const { checkPermission } = useAppContext()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission(UserPermission.UploadFile) })

	return (
		<div className="flex min-h-[50vh] flex-1 flex-col">
			<FileExplorer libraryID={libraryId} rootPath={path} uploadConfig={uploadConfig} />
		</div>
	)
}
