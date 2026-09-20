import { ReadingDirection } from '@stump/graphql'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'

type Props = {
	direction: ReadingDirection
	onChange: (direction: ReadingDirection) => void
}

export default function ReadingDirectionSelect({ direction, onChange }: Props) {
	const { t } = useTranslate()

	return (
		<Picker
			options={[
				{ label: t(getKey(ReadingDirection.Ltr)), value: ReadingDirection.Ltr },
				{ label: t(getKey(ReadingDirection.Rtl)), value: ReadingDirection.Rtl },
			]}
			value={direction}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'readerSettings.readingDirection'
const getKey = (key: ReadingDirection) => `${LOCALE_BASE}.options.${key}`
