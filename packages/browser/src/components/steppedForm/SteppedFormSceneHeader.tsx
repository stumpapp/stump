import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { useSteppedFormContext } from './context'
import SteppedFormIndicators from './SteppedFormIndicators'
import SteppedFormStepDetails from './SteppedFormStepDetails'

// TODO: support docs link
/**
 * A header for scenes which primarily consist of a stepped form. This component
 * requires the SteppedFormProvider to be present in the component tree.
 */
export default function SteppedFormSceneHeader() {
	const { localeBase } = useSteppedFormContext()
	const { t } = useLocaleContext()

	return (
		<header className="flex w-full flex-col space-y-6 border-b border-b-edge p-4">
			<div>
				<Heading size="lg" className="font-bold">
					{t(`${localeBase}.heading`)}
				</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{t(`${localeBase}.subtitle`)}
				</Text>
			</div>

			<SteppedFormIndicators />
			<SteppedFormStepDetails />
		</header>
	)
}
