import { ConfirmationModal } from '@stump/components'
import { EntityVisibility } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

type Props = {
	isOpen: boolean
	onConfirm: () => void
	onCancel: () => void
	target: EntityVisibility
}

export default function ChangeVisibilityConfirmation({
	isOpen,
	onConfirm,
	onCancel,
	target,
}: Props) {
	const { t } = useLocaleContext()

	const localeKey = getKey(target.toLowerCase())
	const description = t(localeKey) === localeKey ? t(getKey('fallback')) : t(localeKey)

	return (
		<ConfirmationModal
			isOpen={isOpen}
			title="Change visibility"
			description={description}
			onConfirm={onConfirm}
			onClose={onCancel}
		/>
	)
}

const LOCALE_KEY = 'smartListSettingsScene.access.sections.visibility.confirmation'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
