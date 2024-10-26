import { useQuery, useSDK } from '@stump/client'

import { FileExplorer } from '@/components/explorer'

import { useSeriesContext } from '../../context'

export default function SeriesExplorerScene() {
	const {
		series: { path },
	} = useSeriesContext()
	const { sdk } = useSDK()
	const { data: uploadConfig } = useQuery([sdk.upload.keys.config], () => sdk.upload.config(), {
		suspense: true,
	})

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={path} uploadConfig={uploadConfig} />
		</div>
	)
}
