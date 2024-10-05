import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useSteppedFormContext } from './context'

export default function SteppedFormStepDetails() {
	const { currentStep, localeBase } = useSteppedFormContext()
	const { t } = useLocaleContext()

	return (
		<div>
			<Text variant="muted" size="sm">
				{t(getKey(localeBase, 'stepLabel'))} {currentStep}
			</Text>
			<Heading>{t(getStepKey(localeBase, currentStep, 'heading'))}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t(getStepKey(localeBase, currentStep, 'description'))}
			</Text>
		</div>
	)
}

const getKey = (base: string, key: string) => `${base}.form.${key}`
const getStepKey = (base: string, step: number, key: string) =>
	`${base}.form.steps.${step - 1}.${key}`
