import { Heading, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useSteppedFormContext } from './context'
import SteppedFormIndicators from './SteppedFormIndicators'
import SteppedFormStepDetails from './SteppedFormStepDetails'

type Props = {
	subtitleLink?: string
}

/**
 * A header for scenes which primarily consist of a stepped form. This component
 * requires the SteppedFormProvider to be present in the component tree.
 */
export default function SteppedFormSceneHeader({ subtitleLink }: Props) {
	const { localeBase } = useSteppedFormContext()
	const { t } = useLocaleContext()

	return (
		<header className="space-y-6 p-4 flex w-full flex-col border-b border-b-border">
			<div>
				<Heading size="lg" className="font-bold">
					{t(`${localeBase}.heading`)}
				</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{t(`${localeBase}.subtitle`)}
					{subtitleLink && (
						<>
							{' '}
							<Link href={subtitleLink}>{t(`${localeBase}.subtitleLink`)}</Link>
						</>
					)}
				</Text>
			</div>

			<SteppedFormIndicators />
			<SteppedFormStepDetails />
		</header>
	)
}
