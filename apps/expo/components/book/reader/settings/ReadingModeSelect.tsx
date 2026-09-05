import { ReadingMode } from '@stump/graphql'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'

type Props = {
	mode: ReadingMode
	onChange: (mode: ReadingMode) => void
}

export default function ReadingModeSelect({ mode, onChange }: Props) {
	const { t } = useTranslate()

	return (
		<Picker
			options={[
				{ label: t(getOption(ReadingMode.Paged)), value: ReadingMode.Paged },
				{
					label: t(getOption(ReadingMode.ContinuousHorizontal)),
					value: ReadingMode.ContinuousHorizontal,
				},
				{
					label: t(getOption(ReadingMode.ContinuousVertical)),
					value: ReadingMode.ContinuousVertical,
				},
			]}
			value={mode}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'readerSettings.readingMode'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getOption = (mode: ReadingMode) => getKey(`options.${mode}`)
