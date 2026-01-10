import { CheckBox, Input, TextArea } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext, useFormState } from 'react-hook-form'

import { useBookClubContextSafe } from '../context'
import { CreateOrUpdateBookClubSchema } from './schema'

const LOCALE_KEY = 'createOrUpdateBookClubForm'
const getKey = (key: string) => `${LOCALE_KEY}.fields.${key}`

export default function BasicBookClubInformation() {
	const form = useFormContext<CreateOrUpdateBookClubSchema>()
	const ctx = useBookClubContextSafe()

	const isCreating = !ctx?.bookClub
	const isPrivate = form.watch('isPrivate')

	const { t } = useLocaleContext()
	const { errors } = useFormState({
		control: form.control,
	})

	return (
		<div className="flex flex-grow flex-col gap-6">
			<Input
				variant="primary"
				label={t(getKey('name.label'))}
				description={t(getKey('name.description'))}
				placeholder={t(getKey('name.placeholder'))}
				containerClassName="max-w-full md:max-w-sm"
				required={isCreating}
				errorMessage={errors.name?.message}
				data-1p-ignore
				{...form.register('name')}
			/>

			<TextArea
				className="flex"
				variant="primary"
				label={t(getKey('description.label'))}
				description={t(getKey('description.description'))}
				placeholder={t(getKey('description.placeholder'))}
				containerClassName="max-w-full md:max-w-sm lg:max-w-lg"
				{...form.register('description')}
			/>

			<CheckBox
				id="is_private"
				variant="primary"
				label={t(getKey('is_private.label'))}
				description={t(getKey('is_private.description'))}
				checked={isPrivate}
				onClick={() => form.setValue('isPrivate', !isPrivate)}
			/>
		</div>
	)
}
