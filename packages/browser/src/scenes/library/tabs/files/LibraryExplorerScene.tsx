import { noop } from 'lodash'

import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={library.path} onUpload={noop} />
		</div>
	)
}
