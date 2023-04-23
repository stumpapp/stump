import { useUsersQuery } from '@stump/client'
import { CheckBox, Text } from '@stump/components'
import { User } from '@stump/types'
import { ColumnDef, getCoreRowModel, getPaginationRowModel } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import Table from '../../../../components/table/Table'
import { useAppContext } from '../../../../context'
import { useLocaleContext } from '../../../../i18n/context'
import { SettingsSubSection } from '../../SettingsLayout'
import UsernameRow from './UsernameRow'

export default function UserTable() {
	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()
	const { users } = useUsersQuery({ enabled: isServerOwner })

	// TODO: mobile columns less? or maybe scroll? idk what would be best UX
	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				columns: [
					{
						cell: () => {
							// const user = info.row.original
							return <CheckBox variant="primary" />
						},
						header: <CheckBox variant="primary" />,
						id: 'select',
					},
					{
						cell: (info) => {
							const user = info.row.original
							return <UsernameRow {...user} />
						},
						header: 'Username',
						id: 'username',
					},
					{
						accessorKey: 'role',
						cell: (info) => {
							return (
								<Text size="sm">
									{info.getValue()?.toLowerCase() === 'server_owner' ? 'Admin' : 'Member'}
								</Text>
							)
						},
						header: 'Role',
						id: 'role',
					},
					{
						cell: () => {
							return (
								<Text size="sm" variant="muted">
									{dayjs().format('LL')}
								</Text>
							)
						},
						header: 'Last Seen',
						id: 'username',
					},
				],
				enableGrouping: false,

				id: 'user',
			},
		],
		[],
	)

	const fakeUsers = Array.from({ length: 100 }, (_, i) => ({
		...users?.[i % users.length],
	})) as User[]

	return (
		<div className="pb-2">
			<SettingsSubSection
				heading="User Table"
				subtitle="View and manage your users using the table below."
			>
				<Table
					sortable
					searchable
					columns={columns}
					options={{
						debugColumns: true,
						debugHeaders: true,
						// If only doing manual pagination, you don't need this
						debugTable: true,
						getCoreRowModel: getCoreRowModel(),
						// TODO: change to manual once API endpoint is ready
						getPaginationRowModel: getPaginationRowModel(),
					}}
					data={fakeUsers ?? []}
					fullWidth
				/>
			</SettingsSubSection>
		</div>
	)
}
