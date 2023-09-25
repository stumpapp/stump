import { Divider, Heading, Text } from '@stump/components'
import React from 'react'

import LoginActivityTable from './LoginActivityTable'

// TODO: clear history button
export default function LoginActivitySection() {
	return (
		<div>
			<Heading size="xs">Login Activity</Heading>
			<Text size="sm" variant="muted">
				See the login activity of your users
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<LoginActivityTable />
		</div>
	)
}
