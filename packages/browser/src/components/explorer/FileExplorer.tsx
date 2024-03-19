import GenericEmptyState from '@/components/GenericEmptyState'

import { useFileExplorerContext } from './context'
import { FileGrid } from './grid'
import { FileTable } from './table'

export default function FileExplorer() {
	const { files, layout } = useFileExplorerContext()

	if (!files.length) {
		return (
			<div className="flex h-full w-full items-center justify-center px-4">
				<GenericEmptyState title="No files" subtitle="This folder is empty" />
			</div>
		)
	}

	return layout === 'grid' ? <FileGrid /> : <FileTable />
}
