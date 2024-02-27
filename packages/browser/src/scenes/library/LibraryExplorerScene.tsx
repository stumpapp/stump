import { FileExplorer } from '@/components/explorer'

import { useLibraryContext } from './context'

export default function LibraryExplorerScene() {
	const {
		library: { path },
	} = useLibraryContext()

	return (
		<div className="h-full w-full">
			<FileExplorer rootPath={path} />
		</div>
	)
}
