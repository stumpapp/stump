import { Text } from '@stump/components'
import { LibraryPattern, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { useLibraryContext } from '@/scenes/library/context'

import { LibrarySettingsConfig } from '../../LibrarySettingsRouter'

export default function PatternDisplay() {
	const { t } = useLocaleContext()

	const { library } = useLibraryContext()
	const {
		config: { libraryPattern },
	} = useFragment(LibrarySettingsConfig, library)

	const localeKey =
		libraryPattern === LibraryPattern.CollectionBased ? 'collectionPriority' : 'seriesPriority'

	return (
		<div
			className="space-y-1.5 rounded-xl p-1 lg:w-auto flex w-full flex-col bg-fill-warning-secondary"
			data-testid="unrestricted-meta"
		>
			<div className="px-2.5 py-0.5 flex items-center text-fill-warning">
				<span className="font-medium">{t(getOptionKey(`${localeKey}.label`))}</span>
			</div>
			<div className="rounded-lg p-2.5 bg-fill-warning-secondary">
				<Text size="sm" className="text-fill-warning">
					{t(getOptionKey(`${localeKey}.description`))}
				</Text>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.libraryPattern'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (key: string) => getKey(`options.${key}`)
