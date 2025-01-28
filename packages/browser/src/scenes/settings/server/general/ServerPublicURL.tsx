import { Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

export default function ServerPublicURL() {
	const { t } = useLocaleContext()

	// TODO: query for public URL
	// TODO: debounced update of public URL

	return (
		<div title="This feature is not available yet">
			<Input
				label={t(getKey('label'))}
				description={t(getKey('description'))}
				placeholder="https://my-stump-instance.cloud"
				disabled
			/>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.server/general.sections.serverPublicUrl'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
