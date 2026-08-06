import { Sheet } from '@stump/components'
import { Preformatted } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { User } from './UserTable'

type Props = {
	user: User | null
	onClose: () => void
}

// TODO: do more than just json dump
export default function InspectUserSlideOver({ user, onClose }: Props) {
	const { t } = useLocaleContext()
	return (
		<Sheet
			open={!!user}
			onClose={onClose}
			title={t('settingsScene.server/users.table.inspect.title')}
			description={t('settingsScene.server/users.table.inspect.description')}
		>
			<Preformatted title={t('settingsScene.server/users.table.inspect.rawJson')} content={user} />
		</Sheet>
	)
}
