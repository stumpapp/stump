import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from '../../context'

export default function LibraryExplorerScene() {
	const { library } = useLibraryContext()

	// TODO(upload): enforce permission
	return (
		<div className="flex flex-1">
			<FileExplorer rootPath={library.path} uploadEnabled />
		</div>
	)
}
