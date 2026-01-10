import { Card, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext, useFormState } from 'react-hook-form'

import { CreateOrUpdateBookClubSchema } from './schema'

const LOCAL_BASE = 'createOrUpdateBookClubForm.fields'
const getKey = (key: string) => `${LOCAL_BASE}.member_role_spec.${key}`

export default function RoleMappingForm() {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateBookClubSchema>()
	const { errors } = useFormState({ control: form.control })

	return (
		<div className="flex flex-col gap-y-6">
			<Card className="grid grid-cols-1 gap-6 bg-background-surface/50 p-4 md:max-w-3xl md:grid-cols-2">
				<Input
					variant="primary"
					fullWidth
					label={t(getKey('member.label'))}
					description={t(getKey('member.description'))}
					descriptionPosition="top"
					placeholder={t(getKey('member.placeholder'))}
					autoComplete="off"
					errorMessage={errors.memberRoleSpec?.MEMBER?.message}
					contrast
					{...form.register('memberRoleSpec.MEMBER')}
				/>

				<Input
					variant="primary"
					fullWidth
					label={t(getKey('moderator.label'))}
					description={t(getKey('moderator.description'))}
					descriptionPosition="top"
					placeholder={t(getKey('moderator.placeholder'))}
					autoComplete="off"
					errorMessage={errors.memberRoleSpec?.MODERATOR?.message}
					contrast
					{...form.register('memberRoleSpec.MODERATOR')}
				/>

				<Input
					variant="primary"
					fullWidth
					label={t(getKey('admin.label'))}
					description={t(getKey('admin.description'))}
					descriptionPosition="top"
					placeholder={t(getKey('admin.placeholder'))}
					autoComplete="off"
					errorMessage={errors.memberRoleSpec?.ADMIN?.message}
					contrast
					{...form.register('memberRoleSpec.ADMIN')}
				/>

				<Input
					variant="primary"
					fullWidth
					label={t(getKey('creator.label'))}
					description={t(getKey('creator.description'))}
					descriptionPosition="top"
					placeholder={t(getKey('creator.placeholder'))}
					autoComplete="off"
					errorMessage={errors.memberRoleSpec?.CREATOR?.message}
					contrast
					{...form.register('memberRoleSpec.CREATOR')}
				/>
			</Card>
		</div>
	)
}
