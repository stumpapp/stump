import { Badge, Button, Card, CheckBox, cn, Heading, Text } from '@stump/components'
import {
	ColumnDef,
	createColumnHelper,
	getPaginationRowModel,
	RowSelectionState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import { Table } from '@/components/table'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import UsernameRow from '@/scenes/settings/server/users/user-table/UsernameRow'

export type AccessUser = {
	__typename?: 'User' | undefined
	id: string
	username: string
	avatarUrl?: string | null | undefined
}

type Props = {
	allUsers: AccessUser[]
	grantedIds: Set<string>
	onGrant: (ids: string[]) => void
	onRevoke: (ids: string[]) => void
	isPending?: boolean
	showHeader?: boolean
}

const columnHelper = createColumnHelper<AccessUser>()

export function UserAccessTable({
	allUsers,
	grantedIds,
	onGrant,
	onRevoke,
	isPending = false,
	showHeader = true,
}: Props) {
	const { t, translate } = useTranslate()
	const {
		user: { id: currentUserId },
	} = useAppContext()

	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

	const selectableUsers = useMemo(
		() => allUsers.filter((user) => user.id !== currentUserId),
		[allUsers, currentUserId],
	)
	// ^ the viewer can't change their own access, so they are never selectable

	const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
	const canGrant = selectedIds.some((id) => !grantedIds.has(id))
	const canRevoke = selectedIds.some((id) => grantedIds.has(id))
	const allSelected =
		selectableUsers.length > 0 && selectableUsers.every((user) => rowSelection[user.id])
	const someSelected = selectedIds.length > 0

	const toggleAll = (checked: boolean) =>
		setRowSelection(
			checked ? Object.fromEntries(selectableUsers.map((user) => [user.id, true])) : {},
		)

	const grantSelected = () => {
		onGrant(selectedIds)
		setRowSelection({})
	}

	const revokeSelected = () => {
		onRevoke(selectedIds)
		setRowSelection({})
	}

	const columns = useMemo(
		() =>
			[
				columnHelper.accessor('username', {
					cell: ({ row }) => (
						<div className="gap-3 flex items-center">
							<CheckBox
								aria-label={row.original.username}
								checked={row.getIsSelected()}
								disabled={!row.getCanSelect()}
								onCheckedChange={(checked) => row.toggleSelected(checked === true)}
								data-testid={`library-access-checkbox-${row.original.username}`}
							/>
							<div className={cn({ 'opacity-50': !row.getCanSelect() })}>
								<UsernameRow {...row.original} />
							</div>
						</div>
					),
				}),
				columnHelper.display({
					id: 'access',
					cell: ({ row: { original } }) => {
						const granted = grantedIds.has(original.id)
						return (
							<Badge
								size="sm"
								variant={granted ? 'success' : 'warning'}
								data-testid={`library-access-badge-${original.username}-${granted ? 'granted' : 'not-granted'}`}
							>
								{t(getKey(granted ? 'table.granted' : 'table.notGranted'))}
							</Badge>
						)
					},
					size: 100,
				}),
			] as ColumnDef<AccessUser>[],
		[grantedIds, t],
	)

	return (
		<div className="gap-4 flex flex-col">
			{showHeader && (
				<div>
					<Heading size="sm">{t(getKey('heading'))}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t(getKey('description'))}
					</Text>
				</div>
			)}

			<Card className="overflow-hidden">
				<div className="h-12 gap-2 pl-2.5 pr-3 flex items-center justify-between border-b border-border bg-muted/50">
					<div className="gap-3 flex items-center">
						<CheckBox
							aria-label={translate('shared.common.selectAll')}
							checked={allSelected ? true : someSelected ? 'indeterminate' : false}
							disabled={!selectableUsers.length}
							onCheckedChange={(checked) => toggleAll(checked === true)}
						/>
						<Text size="sm" variant="muted">
							{someSelected
								? t(getKey('table.selectedCount'), { count: selectedIds.length })
								: t(getKey('table.selectHint'))}
						</Text>
					</div>

					<div className="gap-2 flex items-center">
						<Button
							size="sm"
							variant="outline"
							disabled={!canRevoke || isPending}
							onClick={revokeSelected}
							data-testid="library-access-revoke-selected-button"
						>
							{t(getKey('actions.revoke'))}
						</Button>
						<Button
							size="sm"
							disabled={!canGrant || isPending}
							onClick={grantSelected}
							data-testid="library-access-grant-selected-button"
						>
							{t(getKey('actions.grant'))}
						</Button>
					</div>
				</div>

				<Table
					columns={columns}
					data={allUsers}
					options={{
						getRowId: (row) => row.id,
						enableRowSelection: (row) => row.original.id !== currentUserId,
						onRowSelectionChange: setRowSelection,
						getPaginationRowModel: getPaginationRowModel(),
						initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
						state: { rowSelection },
					}}
					totalCount={allUsers.length}
					fullWidth
					cellClassName="bg-background"
				/>
			</Card>
		</div>
	)
}

const getKey = (key: string) =>
	`librarySettingsScene.danger-zone/access-control.sections.libraryAccess.${key}`
