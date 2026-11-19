import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	CheckBox,
	Heading,
	Text,
} from '@stump/components'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	RowSelectionState,
	useReactTable,
} from '@tanstack/react-table'
import { AlertCircle, Slash, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import { AddOidcGroupsDialog } from './AddOidcGroupsDialog'

type Props = {
	groups: string[]
	onChange: (groups: string[]) => void
	alertId: string
	disabled?: boolean
}

type GroupRow = { name: string }

const columnHelper = createColumnHelper<GroupRow>()

const columns = [
	columnHelper.accessor('name', {
		cell: ({ row }) => (
			<div className="gap-3 flex items-center">
				<CheckBox
					aria-label={row.original.name}
					checked={row.getIsSelected()}
					disabled={!row.getCanSelect()}
					onCheckedChange={(checked) => row.toggleSelected(checked === true)}
				/>
				<Text size="sm">{row.original.name}</Text>
			</div>
		),
	}),
]

export function OidcGroupsTable({ groups, onChange, alertId, disabled = false }: Props) {
	const { t, translate } = useTranslate()

	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const rows = useMemo(
		() => [...groups].sort((a, b) => a.localeCompare(b)).map((name) => ({ name })),
		[groups],
	)
	// ^ manually memo'd bc react table not compiler-friendly

	const table = useReactTable({
		columns,
		data: rows,
		getRowId: (row) => row.name,
		getCoreRowModel: getCoreRowModel(),
		enableRowSelection: !disabled,
		onRowSelectionChange: setRowSelection,
		state: { rowSelection },
	})

	const selected = Object.keys(rowSelection).filter(
		(name) => rowSelection[name] && groups.includes(name),
	)
	const allSelected = rows.length > 0 && selected.length === rows.length

	const removeSelected = () => {
		onChange(groups.filter((group) => !selected.includes(group)))
		setRowSelection({})
	}

	const addGroups = (added: string[]) => {
		onChange([...groups, ...added])
		setRowSelection({})
	}

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

			<Alert variant="info" dismissible id={alertId}>
				<AlertCircle />
				<AlertTitle>{t(getKey('disclaimer.title'))}</AlertTitle>
				<AlertDescription>{t(getKey('disclaimer.description'))}</AlertDescription>
			</Alert>

			<Card className="overflow-hidden">
				<div className="h-12 gap-2 pl-2.5 pr-3 flex items-center justify-between border-b border-border bg-muted/50">
					<div className="gap-3 flex items-center">
						<CheckBox
							aria-label={translate('shared.common.selectAll')}
							checked={allSelected ? true : selected.length ? 'indeterminate' : false}
							disabled={disabled || !rows.length}
							onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
						/>
						<Text size="sm" variant="muted">
							{selected.length
								? t(getKey('selectedCount'), { count: selected.length })
								: t(getKey('count'), { count: groups.length })}
						</Text>
					</div>

					<div className="gap-2 flex items-center">
						<Button
							size="sm"
							variant="outline"
							disabled={disabled || !selected.length}
							onClick={removeSelected}
						>
							{translate('shared.common.remove')}
						</Button>

						<AddOidcGroupsDialog existing={groups} disabled={disabled} onAdd={addGroups} />
					</div>
				</div>

				{rows.length > 0 && (
					<table className="w-full">
						<tbody className="divide divide-y divide-border">
							{table.getRowModel().rows.map((row) => (
								<tr key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="h-12 pl-2.5 pr-3 bg-background">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				)}

				{rows.length <= 0 && (
					<div className="p-6 space-y-3 flex flex-col items-center bg-background">
						<span className="p-2 relative flex items-center justify-center rounded-lg bg-muted">
							<Users className="h-6 w-6 text-muted-foreground" />
							<Slash className="h-6 w-6 absolute scale-x-[-1] transform text-foreground opacity-80" />
						</span>
						<div className="text-center">
							<Text>{t(getKey('empty.title'))}</Text>
							<Text size="sm" variant="muted">
								{t(getKey('empty.description'))}
							</Text>
						</div>
					</div>
				)}
			</Card>
		</div>
	)
}

const getKey = (key: string) =>
	`librarySettingsScene.danger-zone/access-control.sections.oidcGroups.${key}`
