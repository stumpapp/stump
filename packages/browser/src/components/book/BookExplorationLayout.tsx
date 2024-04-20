import { IconButton, ToolTip } from '@stump/components'
import { LayoutGrid, Table } from 'lucide-react'
import React from 'react'

export default function BookExplorationLayout() {
	return (
		<div className="flex shrink-0 items-center gap-1">
			<ToolTip content="Grid" size="sm">
				<IconButton
					variant="ghost"
					size="xs"
					className="hover:bg-background-300"
					pressEffect={false}
					// onClick={() => setLayout('grid')}
					// disabled={layout === 'grid'}
				>
					<LayoutGrid className="h-4 w-4" />
				</IconButton>
			</ToolTip>

			<ToolTip content="Table" size="sm" align="end">
				<IconButton
					variant="ghost"
					size="xs"
					className="hover:bg-background-300"
					pressEffect={false}
					// onClick={() => setLayout('table')}
					// disabled={layout === 'table'}
				>
					<Table className="h-4 w-4" />
				</IconButton>
			</ToolTip>
		</div>
	)
}
