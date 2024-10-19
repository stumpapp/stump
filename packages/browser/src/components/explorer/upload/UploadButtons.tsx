import { IconButton, ToolTip } from '@stump/components'
import { BookPlus, FolderPlus } from 'lucide-react'
import React from 'react'

export default function UploadButtons() {
	return (
		<>
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
