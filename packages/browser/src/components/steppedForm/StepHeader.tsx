import { Heading, Text } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

import { useSteppedFormContext } from './context'
import { getStepKey } from './utils'

export function StepHeader() {
	const { currentIndex, localeBase } = useSteppedFormContext()
	const { t } = useTranslate()

	return (
		<div className="lg:mt-0 mt-4">
			<Heading size="sm">{t(getStepKey(localeBase, currentIndex, 'heading'))}</Heading>
			<Text size="sm" variant="muted" className="mt-1">
				{t(getStepKey(localeBase, currentIndex, 'description'))}
			</Text>
		</div>
	)
}
