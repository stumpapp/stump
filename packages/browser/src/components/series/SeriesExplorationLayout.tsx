import { IconButton, ToolTip } from '@stump/components'
import { InterfaceLayout } from '@stump/graphql'
import { LayoutGrid, Table } from 'lucide-react'

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
					onClick={() => setLayout(InterfaceLayout.Grid)}
					disabled={layout === InterfaceLayout.Grid}
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
					onClick={() => setLayout(InterfaceLayout.Table)}
					disabled={layout === InterfaceLayout.Table}
				>
					<Table className="h-4 w-4" />
				</IconButton>
			</ToolTip>
		</div>
	)
}
