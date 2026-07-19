import { Heading, Text } from '@stump/components'
import { Suspense } from 'react'

import ClearLoginActivityConfirmation from './ClearActivityConfirmation'
import LoginActivityTable from './LoginActivityTable'

// TODO(i8n): add key/values
export default function LoginActivitySection() {
	return (
		<div className="gap-y-4 flex flex-col">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">Authentication history</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						All login attempts are logged and stored for security purposes
					</Text>
				</div>

				<ClearLoginActivityConfirmation />
			</div>

			<div className="gap-3 flex flex-col">
				<Suspense>
					<LoginActivityTable />
				</Suspense>
			</div>
		</div>
	)
}
