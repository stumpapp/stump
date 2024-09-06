import { IconButton, ToolTip } from '@stump/components'
import { Grid2X2, Table } from 'lucide-react'
import React from 'react'

import { useFileExplorerContext } from './context'

export default function LayoutButtons() {
	const { layout, setLayout } = useFileExplorerContext()

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
