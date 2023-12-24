import { ButtonOrLink, Heading } from '@stump/components'

import DeleteUserModal from './DeleteUserModal'
import UserTable from './UserTable'

export default function UserTableSection() {
	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-end justify-between">
				<Heading size="xs">Existing accounts</Heading>
				<div className="flex items-end gap-2">
					<DeleteUserModal />
					<ButtonOrLink href="create" variant="secondary" size="sm">
						Create user
					</ButtonOrLink>
				</div>
			</div>

			<UserTable />
		</div>
	)
}
