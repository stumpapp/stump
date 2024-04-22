import React from 'react'

import { FileExplorer } from '@/components/explorer'

import { useSeriesContext } from '../../context'

export default function SeriesExplorerScene() {
	const {
		series: { path },
	} = useSeriesContext()

	return (
		<div className="h-full w-full">
			<FileExplorer rootPath={path} />
		</div>
	)
}
