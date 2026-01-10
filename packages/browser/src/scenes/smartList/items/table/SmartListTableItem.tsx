import { Media } from '@stump/graphql'
import { flexRender, Row } from '@tanstack/react-table'

type Props = {
	row: Row<Media>
	style?: React.CSSProperties
}

export const SmartListTableItem = ({ row, style }: Props) => {
	return (
		<div
			className="flex w-full border-b border-edge bg-background hover:bg-background-surface/50"
			style={style}
		>
			{row.getVisibleCells().map((cell) => (
				<div
					key={cell.id}
					className="flex items-center overflow-hidden px-4 py-2"
					style={{
						width: cell.column.getSize(),
						minWidth: cell.column.columnDef.minSize,
						maxWidth: cell.column.columnDef.maxSize,
						flex: `0 0 ${cell.column.getSize()}px`,
					}}
				>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</div>
			))}
		</div>
	)
}
