import { ButtonOrLink, Heading, Text } from '@stump/components'
import { Suspense } from 'react'

import UserTable from './UserTable'

export default function UserTableSection() {
	return (
		<div className="gap-y-4 flex flex-col">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">Existing accounts</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						A list of all existing accounts on the server
					</Text>
				</div>
				<div className="gap-2 flex items-end">
					<ButtonOrLink href="create" variant="secondary" size="sm">
						Create user
					</ButtonOrLink>
				</div>
			</div>

			<Suspense>
				<UserTable />
			</Suspense>
		</div>
	)
}
