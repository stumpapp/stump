import { cn, IconButton, ToolTip } from '@stump/components'
import { Grid2X2, Table } from 'lucide-react'

import { useFileExplorerContext } from './context'

export default function LayoutButtons() {
	const { layout, setLayout } = useFileExplorerContext()

	return (
		<div className="gap-0.5 flex shrink-0 items-center">
			<ToolTip content="Grid view" align="end">
				<IconButton
					variant="ghost"
					size="sm"
					className={cn(
						'transition-colors',
						layout === 'grid'
							? 'bg-muted text-foreground hover:bg-muted'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground',
					)}
					onClick={() => setLayout('grid')}
				>
					<Grid2X2 className="h-3.5 w-3.5" />
				</IconButton>
			</ToolTip>

			<ToolTip content="Table view" align="end">
				<IconButton
					variant="ghost"
					size="sm"
					className={cn(
						'transition-colors',
						layout === 'table'
							? 'bg-muted text-foreground hover:bg-muted'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground',
					)}
					onClick={() => setLayout('table')}
				>
					<Table className="h-3.5 w-3.5" />
				</IconButton>
			</ToolTip>
		</div>
	)
}
