import { Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { ReviewStepContainer } from '@/components/steppedForm'

import FilterConfigJSON from './FilterConfigJSON'
import { SmartListFormSchema } from '../schema'

export default function SmartListReview() {
	const form = useFormContext<SmartListFormSchema>()
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

				<div>
					<Label>{t(getLabelKey('visibility'))}</Label>
					<Text variant="muted" size="sm">
						{state.visibility}
					</Text>
				</div>
			</ReviewStepContainer>

			<ReviewStepContainer
				label={t(getStepKey(2, 'heading'))}
				description={t(getStepKey(2, 'description'))}
			>
				<div>
					<Label>{t(getLabelKey('grouping'))}</Label>
					<Text variant="muted" size="sm">
						{state.grouping}
					</Text>
				</div>
			</ReviewStepContainer>

			<div className="grid grid-cols-9">
				<div className="col-span-9 md:col-span-6">
					<FilterConfigJSON />
				</div>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createSmartListScene.form'
const getStepKey = (step: number, key: string) => `${LOCALE_KEY}.steps.${step - 1}.${key}`
const getKey = (key: string) => `${LOCALE_KEY}.review.${key}`
const getLabelKey = (key: string) => getKey(`labels.${key}`)
