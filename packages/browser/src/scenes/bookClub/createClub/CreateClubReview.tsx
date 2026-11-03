import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateBookClubSchema } from '@/components/bookClub/createOrUpdateForm'
import { ReviewItem, ReviewSection } from '@/components/steppedForm'
import { useTranslate } from '@/hooks/useTranslate'

// TODO(club): Add more

export default function CreateClubReview() {
	const form = useFormContext<CreateOrUpdateBookClubSchema>()
	const state = form.watch()

	const { t } = useTranslate()

	return (
		<>
			<ReviewSection stepIndex={0}>
				<ReviewItem label={t(getLabelKey('name'))} value={state.name} />
				<ReviewItem label={t(getLabelKey('description'))} value={state.description} />
			</ReviewSection>
		</>
	)
}

const LOCALE_KEY = 'createBookClubScene.form'
const getKey = (key: string) => `${LOCALE_KEY}.review.${key}`
const getLabelKey = (key: string) => getKey(`labels.${key}`)
