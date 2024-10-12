import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useCreateLibraryContext } from './context'

export default function CreateLibraryStepDetails() {
	const { formStep } = useCreateLibraryContext()
	const { t } = useLocaleContext()

	return (
		<div>
			<Text variant="muted" size="sm">
				{t(getKey('stepLabel'))} {formStep}
			</Text>
			<Heading>{t(getStepKey(formStep, 'heading'))}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t(getStepKey(formStep, 'description'))}
			</Text>
		</div>
	)
}

const LOCALE_KEY = 'createLibraryScene.form'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getStepKey = (step: number, key: string) => `${LOCALE_KEY}.steps.${step - 1}.${key}`
