import { Sheet } from '@stump/components'
import { Preformatted } from '@stump/components'
import { usePrevious } from 'react-use'

import { useTranslate } from '@/hooks/useTranslate'

import { User } from './UserTable'

type Props = {
	user: User | null
	onClose: () => void
}

// TODO: do more than just json dump

export default function InspectUserSlideOver({ user, onClose }: Props) {
	const { t } = useTranslate()
	const previousUser = usePrevious(user)

	const displayedUser = user || previousUser

	return (
		<Sheet
			open={!!user}
			onClose={onClose}
			title={t('settingsScene.server/users.userTable.inspectUser.heading')}
			description={t('settingsScene.server/users.userTable.inspectUser.description')}
		>
			<div className="px-4 gap-y-8 flex flex-col">
				<Preformatted
					title={t('settingsScene.server/users.userTable.inspectUser.json')}
					content={displayedUser}
				/>
			</div>
		</Sheet>
	)
}
