import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { DoublePageBehavior } from '~/stores/reader'

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

export default function DoublePageSelect({ behavior, onChange }: Props) {
	const { translate } = useTranslate()

	return (
		<Picker
			options={[
				{ label: translate(getKey('auto')), value: 'auto' },
				{ label: translate(getKey('always')), value: 'always' },
				{ label: translate(getKey('off')), value: 'off' },
			]}
			value={behavior}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'shared.readerSettings.doublePageBehavior'
const getKey = (key: DoublePageBehavior) => `${LOCALE_BASE}.options.${key}`
