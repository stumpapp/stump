import { useGraphQLMutation, useSuspenseGraphQLQueries } from '@stump/client'
import { Badge, Button, Card, CheckBox, cn, Heading, Text } from '@stump/components'
import { graphql, LibraryAccessUsersQueryQuery } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import {
	ColumnDef,
	createColumnHelper,
	getPaginationRowModel,
	RowSelectionState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import Table from '@/components/table/Table'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import UsernameRow from '@/scenes/settings/server/users/user-table/UsernameRow'

import { useLibraryContext } from '../../context'

const usersQuery = graphql(`
	query LibraryAccessUsersQuery {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				username
				avatarUrl
			}
		}
	}
`)

const allowedUsersQuery = graphql(`
	query LibraryAccessQuery($id: ID!) {
		libraryById(id: $id) {
			allowedUsers {
				id
				username
			}
		}
	}
`)

const mutation = graphql(`
	mutation UpdateLibraryAccess($id: ID!, $userIds: [String!]!) {
		updateLibraryAccess(id: $id, userIds: $userIds) {
			id
			allowedUsers {
				id
				username
			}
		}
	}
`)

type AccessUser = LibraryAccessUsersQueryQuery['users']['nodes'][number]

const columnHelper = createColumnHelper<AccessUser>()

export function LibraryAccess() {
	const { library } = useLibraryContext()
	const { user } = useAppContext()
	const { t, translate } = useTranslate()

	const [
		{
			data: {
				users: { nodes: allUsers },
			},
		},
		{
			data: { libraryById },
		},
	] = useSuspenseGraphQLQueries([
		{
			document: usersQuery,
			queryKey: ['users'],
		},
		{
			document: allowedUsersQuery,
			queryKey: ['libraryAccess', library.id],
			// @ts-expect-error: Need to fix this type error with useSuspenseGraphQLQueries
			variables: { id: library.id },
		},
	])

	const grantedIds = useMemo(
		() => new Set((libraryById?.allowedUsers || []).map((u) => u.id)),
		[libraryById],
	)

	const client = useQueryClient()
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

	const { mutate, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateLibraryAccess: { allowedUsers } }) => {
			setRowSelection({})
			// update without refetching to reduce network
			client.setQueryData(['libraryAccess', library.id], {
				libraryById: { ...libraryById, allowedUsers },
			})
		},
	})

	const selectableUsers = useMemo(
		() => allUsers.filter((u) => u.id !== user.id),
		[allUsers, user.id],
	)
	// ^ the viewer can't change their own access, so they are never selectable

	const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
	const canGrant = selectedIds.some((id) => !grantedIds.has(id))
	const canRevoke = selectedIds.some((id) => grantedIds.has(id))

	const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => rowSelection[u.id])
	const someSelected = selectedIds.length > 0

	const toggleAll = (checked: boolean) =>
		setRowSelection(checked ? Object.fromEntries(selectableUsers.map((u) => [u.id, true])) : {})

	const grantSelected = () =>
		mutate({ id: library.id, userIds: [...new Set([...grantedIds, ...selectedIds])] })

	const revokeSelected = () =>
		mutate({
			id: library.id,
			userIds: [...grantedIds].filter((id) => id === user.id || !selectedIds.includes(id)),
		})

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
							<Badge size="sm" variant={granted ? 'success' : 'warning'}>
								{t(getKey(granted ? 'table.granted' : 'table.notGranted'))}
							</Badge>
						)
					},
					size: 100,
				}),
			] as ColumnDef<AccessUser>[],
		[t, grantedIds],
	)

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description'))}
				</Text>
			</div>

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
						>
							{t(getKey('actions.revoke'))}
						</Button>
						<Button size="sm" disabled={!canGrant || isPending} onClick={grantSelected}>
							{t(getKey('actions.grant'))}
						</Button>
					</div>
				</div>

				<Table
					columns={columns}
					data={allUsers}
					options={{
						getRowId: (row) => row.id,
						enableRowSelection: (row) => row.original.id !== user.id,
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
