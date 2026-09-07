import { Sheet } from '@stump/components'
import { Preformatted } from '@stump/components'
import { usePrevious } from 'react-use'

import { User } from './UserTable'

type Props = {
	user: User | null
	onClose: () => void
}

// TODO: do more than just json dump

export default function InspectUserSlideOver({ user, onClose }: Props) {
	const previousUser = usePrevious(user)

	const displayedUser = user || previousUser

	return (
		<Sheet
			open={!!user}
			onClose={onClose}
			title="Inspect user"
			description="Inspect a user's information and configuration"
		>
			<div className="px-4 gap-y-8 flex flex-col">
				<Preformatted title="JSON" content={displayedUser} />
			</div>
		</Sheet>
	)
}
