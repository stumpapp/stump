import { IconButton, ToolTip } from '@stump/components'
import { LayoutGrid, Table } from 'lucide-react'
import React from 'react'

import { useSeriesLayout } from '@/stores/layout'

export default function SeriesExplorationLayout() {
	const { layout, setLayout } = useSeriesLayout((state) => ({
		layout: state.layout,
		setLayout: state.setLayout,
	}))

	return (
		<div className="flex shrink-0 items-center gap-1">
			<ToolTip content="Grid" size="sm">
				<IconButton
					variant="ghost"
					size="xs"
					className="hover:bg-background-surface-hover"
					pressEffect={false}
					onClick={() => setLayout('GRID')}
					disabled={layout === 'GRID'}
				>
					<LayoutGrid className="h-4 w-4" />
				</IconButton>
			</ToolTip>

			<ToolTip content="Table" size="sm" align="end">
				<IconButton
					variant="ghost"
					size="xs"
					className="hover:bg-background-surface-hover"
					pressEffect={false}
					onClick={() => setLayout('TABLE')}
					disabled={layout === 'TABLE'}
				>
					<Table className="h-4 w-4" />
				</IconButton>
			</ToolTip>
		</div>
	)
}
