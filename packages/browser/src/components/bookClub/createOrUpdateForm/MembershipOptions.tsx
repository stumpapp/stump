import { CheckBox, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateBookClubSchema } from './schema'

const LOCALE_KEY = 'createOrUpdateBookClubForm.fields.membershipOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function MembershipOptions() {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateBookClubSchema>()
	const creatorHideProgress = form.watch('creatorHideProgress')

	return (
		<div className="flex flex-col gap-4 pt-2 md:max-w-lg">
			<Input
				variant="primary"
				fullWidth
				label={t(getKey('displayName.label'))}
				description={t(getKey('displayName.description'))}
				descriptionPosition="top"
				placeholder={t(getKey('displayName.placeholder'))}
				autoComplete="off"
				errorMessage={form.formState.errors.creatorDisplayName?.message}
				{...form.register('creatorDisplayName')}
			/>

			<CheckBox
				id="creatorHideProgress"
				variant="primary"
				label={t(getKey('hideProgress.label'))}
				description={t(getKey('hideProgress.description'))}
				checked={creatorHideProgress}
				onClick={() => form.setValue('creatorHideProgress', !creatorHideProgress)}
			/>
		</div>
	)
}
