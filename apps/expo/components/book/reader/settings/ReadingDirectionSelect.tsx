import { ReadingDirection } from '@stump/graphql'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'

type Props = {
	direction: ReadingDirection
	onChange: (direction: ReadingDirection) => void
}

export default function ReadingDirectionSelect({ direction, onChange }: Props) {
	const { translate } = useTranslate()

	return (
		<Picker
			options={[
				{ label: translate(getKey(ReadingDirection.Ltr)), value: ReadingDirection.Ltr },
				{ label: translate(getKey(ReadingDirection.Rtl)), value: ReadingDirection.Rtl },
			]}
			value={direction}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'shared.readerSettings.readingDirection'
const getKey = (key: ReadingDirection) => `${LOCALE_BASE}.options.${key}`
