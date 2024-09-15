import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const {
		library: { path },
	} = useLibraryContext()

	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={path} />
		</div>
	)
}
