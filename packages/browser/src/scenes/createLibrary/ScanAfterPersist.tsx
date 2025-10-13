import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { useLibraryContextSafe } from '@/scenes/library/context'

export default function ScanAfterPersist() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()

	const { t } = useLocaleContext()

	const scanAfterPersist = form.watch('scanAfterPersist')
	const isCreatingLibrary = !ctx?.library

	return (
		<WideSwitch
			label={t(getKey(`label.${isCreatingLibrary ? 'create' : 'update'}`))}
			description={t(getKey('description'))}
			checked={scanAfterPersist}
			onCheckedChange={() => form.setValue('scanAfterPersist', !scanAfterPersist)}
		/>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.scan'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
