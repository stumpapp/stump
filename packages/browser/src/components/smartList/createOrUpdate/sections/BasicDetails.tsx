import { Input, TextArea } from '@stump/components'
import { useFormContext } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

import { SmartListFormSchema } from '../schema'

type SubSchema = Pick<SmartListFormSchema, 'name' | 'description'>

export default function BasicDetails() {
	const form = useFormContext<SubSchema>()

	const { t } = useTranslate()

	return (
		<div className="gap-y-6 flex flex-col">
			<Input
				label={t(getKey('name.label'))}
				description={t(getKey('name.description'))}
				placeholder={t(getKey('name.placeholder'))}
				errorMessage={form.formState.errors.name?.message}
				{...form.register('name')}
				data-1p-ignore
			/>

			<TextArea
				label={t(getKey('description.label'))}
				description={t(getKey('description.description'))}
				placeholder={t(getKey('description.placeholder'))}
				className="md:w-3/5"
				{...form.register('description')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateSmartListForm.fields'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
