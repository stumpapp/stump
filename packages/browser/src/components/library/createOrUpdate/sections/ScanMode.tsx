import { useLocaleContext } from '@stump/i18n'
import { LibraryScanMode } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'
import { WideStyleSwitch } from '@/scenes/settings'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function ScanModeForm() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()

	const { t } = useLocaleContext()

	const scanMode = form.watch('scan_mode')
	const isCreatingLibrary = !ctx?.library

	const handleChange = (newMode: LibraryScanMode) => {
		form.setValue('scan_mode', newMode)
	}

	return (
		<WideStyleSwitch
			label={t(getKey(`label.${isCreatingLibrary ? 'create' : 'update'}`))}
			description={t(getKey('description'))}
			isChecked={scanMode !== 'NONE'}
			onToggle={() => handleChange(scanMode === 'NONE' ? 'DEFAULT' : 'NONE')}
		/>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.scan'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
