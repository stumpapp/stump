import { cn } from '@stump/components'
import React, { forwardRef } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { GridListProps, VirtuosoGrid } from 'react-virtuoso'

import { useFileExplorerContext } from '../context'
import FileGridItem from './FileGridItem'

export default function FileGrid() {
	const { files } = useFileExplorerContext()

	const renderItem = (idx: number) => {
		const file = files[idx]
		if (file) {
			return <FileGridItem key={`${idx}-file-${file.name}`} file={file} />
		} else {
			return null
		}
	}

	return (
		<div className="flex h-full w-full flex-1 flex-grow">
			<AutoSizer>
				{({ height, width }) => (
					<VirtuosoGrid
						style={{ height, width }}
						totalCount={files.length}
						className="scrollbar-hide"
						listClassName={cn('flex flex-1 flex-wrap gap-2 place-content-center')}
						itemContent={renderItem}
					/>
				)}
			</AutoSizer>
		</div>
	)
}

const GridListWrapper = forwardRef<HTMLDivElement, GridListProps>(
	({ children, style, ...props }, ref) => (
		<div ref={ref} {...props} style={{ display: 'flex', flexWrap: 'wrap', ...style }}>
			{children}
		</div>
	),
)
GridListWrapper.displayName = 'GridListWrapper'
