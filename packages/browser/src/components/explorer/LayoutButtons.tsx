import { IconButton, ToolTip } from '@stump/components'
import { BookPlus, FolderPlus, Grid2X2, Table } from 'lucide-react'
import React from 'react'

import { useFileExplorerContext } from './context'

export default function LayoutButtons() {
	const { layout, setLayout, displayUpload } = useFileExplorerContext()

	const defaultButtons = () => {
		return (
			<>
				<ToolTip content="Grid view">
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-surface-hover"
						pressEffect={false}
						onClick={() => setLayout('grid')}
						disabled={layout === 'grid'}
					>
						<Grid2X2 className="h-4 w-4" />
					</IconButton>
				</ToolTip>

				<ToolTip content="Table view">
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-surface-hover"
						pressEffect={false}
						onClick={() => setLayout('table')}
						disabled={layout === 'table'}
					>
						<Table className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			</>
		)
	}

	const uploadButtons = () => {
		return (
			<>
				{/* Spacing from default buttons */}
				<div className="w-4" />

				{/* Add series button */}
				<ToolTip content="Add a series">
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-surface-hover"
						pressEffect={false}
						onClick={() => {}}
						disabled={false}
					>
						<FolderPlus className="h-4 w-4" />
					</IconButton>
				</ToolTip>

				{/* Add book button */}
				<ToolTip content="Add a book">
					<IconButton
						variant="ghost"
						size="xs"
						className="hover:bg-background-surface-hover"
						pressEffect={false}
						onClick={() => {}}
						disabled={false}
					>
						<BookPlus className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			</>
		)
	}

	return (
		<>
			{defaultButtons()}
			{displayUpload && uploadButtons()}
		</>
	)
}
