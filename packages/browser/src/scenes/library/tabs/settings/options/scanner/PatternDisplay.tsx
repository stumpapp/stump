import { Text } from '@stump/components'
import { useFragment } from '@stump/graphql'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContext } from '@/scenes/library/context'

import { LibrarySettingsConfig } from '../../LibrarySettingsRouter'

// TODO(ui): this can have a better home I think, even just a disabled
// card row is probably more consistent

export default function PatternDisplay() {
	const { t } = useTranslate()

	const { library } = useLibraryContext()
	const {
		config: { libraryPattern },
	} = useFragment(LibrarySettingsConfig, library)

	return (
		<div
			className="space-y-1.5 p-1 lg:w-auto bg-black/5 dark:bg-white/10 flex w-full flex-col rounded-xl"
			data-testid="unrestricted-meta"
		>
			<div className="px-2.5 py-0.5 flex items-center">
				<span className="font-medium">{t(getKey(`${libraryPattern}.label`))}</span>
			</div>
			<div className="p-2.5 bg-black/5 dark:bg-white/10 rounded-lg">
				<Text size="sm">{t(getKey(`${libraryPattern}.description`))}</Text>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.organization.filesystemPattern'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
