import { Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateBookClubSchema } from '@/components/bookClub/createOrUpdateForm'
import { ReviewStepContainer } from '@/components/steppedForm'

// TODO(club): Add more

export default function CreateClubReview() {
	const form = useFormContext<CreateOrUpdateBookClubSchema>()
	const state = form.watch()

	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col space-y-8">
			<ReviewStepContainer
				label={t(getStepKey(1, 'heading'))}
				description={t(getStepKey(1, 'description'))}
			>
				<div>
					<Label>{t(getLabelKey('name'))}</Label>
					<Text variant="muted" size="sm">
						{state.name}
					</Text>
				</div>
				<div>
					<Label>{t(getLabelKey('description'))}</Label>
					<Text variant="muted" size="sm">
						{state.description || 'None'}
					</Text>
				</div>
			</ReviewStepContainer>
		</div>
	)
}

const LOCALE_KEY = 'createBookClubScene.form'
const getStepKey = (step: number, key: string) => `${LOCALE_KEY}.steps.${step - 1}.${key}`
const getKey = (key: string) => `${LOCALE_KEY}.review.${key}`
const getLabelKey = (key: string) => getKey(`labels.${key}`)
