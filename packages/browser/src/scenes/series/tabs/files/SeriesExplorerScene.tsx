import React from 'react'

import { FileExplorer } from '@/components/explorer'

import { useSeriesContext } from '../../context'

export default function SeriesExplorerScene() {
	const {
		series: { path },
	} = useSeriesContext()

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={path} displayUpload={true} />
		</div>
	)
}
