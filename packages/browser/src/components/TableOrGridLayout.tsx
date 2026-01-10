import { IconButton, ToolTip } from '@stump/components'
import { InterfaceLayout } from '@stump/graphql'
import { LayoutGrid, Table } from 'lucide-react'

type Props = {
	layout: InterfaceLayout
	setLayout: (layout: InterfaceLayout) => void
}

export default function TableOrGridLayout({ layout, setLayout }: Props) {
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
