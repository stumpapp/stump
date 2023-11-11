import { ButtonOrLink, Divider, Heading, Text } from '@stump/components'

import DeleteUserModal from './DeleteUserModal'
import UserTable from './UserTable'

export default function UserTableSection() {
	return (
		<div>
			<div className="flex items-start justify-between">
				<Heading size="xs">Users</Heading>
				<div className="flex items-start gap-2">
					<DeleteUserModal />
					<ButtonOrLink href="create" variant="secondary">
						Create user
					</ButtonOrLink>
				</div>
			</div>

			<Text size="sm" variant="muted">
				View and manage your users using the table below
			</Text>
			<Divider variant="muted" className="my-3.5" />
			<UserTable />
		</div>
	)
}
