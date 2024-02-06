import { Heading, Text } from '@stump/components'
import React from 'react'

import ClearActivitySection from './ClearActivitySection'
import LoginActivityTable from './LoginActivityTable'

export default function LoginActivitySection() {
	return (
		<div className="flex flex-col gap-y-4">
			<div>
				<Heading size="sm">Authentication history</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					All login attempts are logged and stored for security purposes. You can clear the logs at
					any time
				</Text>
			</div>

			<div className="flex flex-col gap-3">
				<LoginActivityTable />
				<ClearActivitySection />
			</div>
		</div>
	)
}
