import { Divider, Heading, Text } from '@stump/components'
import React from 'react'

import ClearActivitySection from './ClearActivitySection'
import LoginActivityTable from './LoginActivityTable'

export default function LoginActivitySection() {
	return (
		<div>
			<Heading size="xs">Login Activity</Heading>
			<Text size="sm" variant="muted">
				See the login activity of your users
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="flex flex-col gap-3">
				<LoginActivityTable />
				<ClearActivitySection />
			</div>
		</div>
	)
}
