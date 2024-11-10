import { Sheet } from '@stump/components'
import { Preformatted } from '@stump/components'
import { User } from '@stump/sdk'

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
			<Preformatted title="Raw JSON">{JSON.stringify(user, null, 2)}</Preformatted>
		</Sheet>
	)
}
