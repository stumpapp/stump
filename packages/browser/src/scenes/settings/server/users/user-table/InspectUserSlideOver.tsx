import { Sheet } from '@stump/components'
import { User } from '@stump/sdk'
import React from 'react'

type Props = {
	user: User | null
	onClose: () => void
}

// TODO: do more than just json dump
export default function InspectUserSlideOver({ user, onClose }: Props) {
	return (
		<Sheet
			open={!!user}
			onClose={onClose}
			title="Inspect user"
			description="Inspect a user's information and configuration"
		>
			<div className="px-6 py-2">
				<pre>{JSON.stringify(user, null, 2)}</pre>
			</div>
		</Sheet>
	)
}
