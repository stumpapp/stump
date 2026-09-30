import { useUploadConfig } from '@stump/client'
import { UserPermission } from '@stump/graphql'
import { Navigate } from 'react-router'

import { FileExplorer } from '@/components/explorer'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'

import { useSeriesContext } from '../../context'

export default function SeriesExplorerScene() {
	const {
		series: {
			id,
			path,
			library: { id: libraryId },
		},
	} = useSeriesContext()
	const { checkPermission } = useAppContext()
	const paths = usePaths()
	const { uploadConfig } = useUploadConfig({
		enabled: path != null && checkPermission(UserPermission.UploadFile),
	})

	if (path == null) return <Navigate to={paths.seriesOverview(id)} replace />

	return (
		<div className="flex min-h-[50vh] flex-1 flex-col">
			<FileExplorer libraryID={libraryId} rootPath={path} uploadConfig={uploadConfig} />
		</div>
	)
}
