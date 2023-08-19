import { Divider, Heading, Text } from '@stump/components'

import CreateUserModal from './CreateUserModal'
import DeleteUserModal from './DeleteUserModal'
import UserTable from './UserTable'

export default function UserTableSection() {
	return (
		<div className="pb-2">
			<div className="flex items-start justify-between">
				<Heading size="xs">Users</Heading>
				<div className="flex items-start gap-2">
					<DeleteUserModal />
					<CreateUserModal />
				</div>
			</div>

			<Text size="sm" variant="muted" className="mt-1.5">
				View and manage your users using the table below
			</Text>
			<Divider variant="muted" className="my-3.5" />
			<UserTable />
		</div>
	)
}
