import { Heading, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

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
		<header className="space-y-6 p-4 flex w-full flex-col border-b border-b-edge">
			<div>
				<Heading size="lg" className="font-bold">
					{t(`${localeBase}.heading`)}
				</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{t(`${localeBase}.subtitle`)}{' '}
					<Link href="https://www.stumpapp.dev/guides/basics/libraries">
						{t(`${localeBase}.subtitleLink`)}
					</Link>
				</Text>
			</div>

			<SteppedFormIndicators />
			<SteppedFormStepDetails />
		</header>
	)
}
