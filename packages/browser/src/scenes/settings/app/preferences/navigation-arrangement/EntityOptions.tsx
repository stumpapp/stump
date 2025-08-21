import { CheckBox } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { IEntityOptions } from './types'

type Props = {
	isOpen: boolean
	options: IEntityOptions
	onChange: (options: IEntityOptions) => void
}

export default function EntityOptions({ isOpen, options, onChange }: Props) {
	const { t } = useLocaleContext()

	if (!isOpen) {
		return null
	}

	return (
		<div className="flex flex-wrap items-center gap-3 p-4">
			<CheckBox
				variant="primary"
				label={t(getLabel('createAction'))}
				checked={options.show_create_action}
				onClick={() => onChange({ ...options, show_create_action: !options.show_create_action })}
			/>

			<CheckBox
				variant="primary"
				label={t(getLabel('linkToAll'))}
				checked={options.show_link_to_all}
				onClick={() => onChange({ ...options, show_link_to_all: !options.show_link_to_all })}
			/>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.navigationArrangement.entityOptions'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getLabel = (key: string) => getKey(`${key}.label`)
