import { WideSwitch } from '@stump/components'
import { useFormContext, useWatch } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContextSafe } from '@/scenes/library/context'

export default function ScanAfterPersist() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()

	const { t } = useTranslate()

	const scanAfterPersist = useWatch({ control: form.control, name: 'scanAfterPersist' })
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
