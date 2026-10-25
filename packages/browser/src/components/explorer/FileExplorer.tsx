import GenericEmptyState from '@/components/GenericEmptyState'
import { useTranslate } from '@/hooks/useTranslate'

import { useFileExplorerContext } from './context'
import { FileGrid } from './grid'
import { FileTable } from './table'

// TODO: each item within the grid or table makes an API call to get the media and then the associated thumbnail
// This is not optimal, and should be refactored to issue one query and match on the client

export default function FileExplorer() {
	const { t } = useTranslate()
	const { files, layout } = useFileExplorerContext()

	if (!files.length) {
		return (
			<div className="px-4 flex h-full w-full items-center justify-center">
				<GenericEmptyState title={t('common.noFiles')} subtitle={t('common.folderEmpty')} />
			</div>
		)
	}

	return layout === 'grid' ? <FileGrid /> : <FileTable />
}
