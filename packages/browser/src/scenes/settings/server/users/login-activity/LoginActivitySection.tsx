import { Heading, Text } from '@stump/components'
import { Suspense } from 'react'

import ClearLoginActivityConfirmation from './ClearActivityConfirmation'
import LoginActivityTable from './LoginActivityTable'

// TODO: locale
// TODO: move clear to top section
export default function LoginActivitySection() {
	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">Authentication history</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						All login attempts are logged and stored for security purposes
					</Text>
				</div>

				{/* 
				<ClearActivitySection /> */}
				<ClearLoginActivityConfirmation />
			</div>

			<div className="flex flex-col gap-3">
				<Suspense>
					<LoginActivityTable />
				</Suspense>
			</div>
		</div>
	)
}
