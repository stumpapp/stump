import AutoSizer from 'react-virtualized-auto-sizer'
import { VirtuosoGrid } from 'react-virtuoso'

import { useFileExplorerContext } from '../context'
import FileGridItem from './FileGridItem'

export default function FileGrid() {
	const { files, loadMore } = useFileExplorerContext()

	const renderItem = (idx: number) => {
		const file = files[idx]
		if (file) {
			return <FileGridItem key={`${idx}-file-${file.name}`} file={file} />
		} else {
			return null
		}
	}

	return (
		<div className="flex h-full w-full flex-1 grow">
			<AutoSizer>
				{({ height, width }) => (
					<VirtuosoGrid
						style={{ height, width }}
						totalCount={files.length}
						className="scrollbar-hide"
						listClassName="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-4 items-start"
						itemContent={renderItem}
						overscan={{ main: 15, reverse: 10 }}
						endReached={loadMore}
					/>
				)}
			</AutoSizer>
		</div>
	)
}
