import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { DoublePageBehavior } from '~/stores/reader'

type Props = {
	behavior: DoublePageBehavior
	onChange: (behavior: DoublePageBehavior) => void
}

export default function DoublePageSelect({ behavior, onChange }: Props) {
	const { t } = useTranslate()

	return (
		<Picker
			options={[
				{ label: t(getKey('auto')), value: 'auto' },
				{ label: t(getKey('always')), value: 'always' },
				{ label: t(getKey('off')), value: 'off' },
			]}
			value={behavior}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'readerSettings.doublePageBehavior'
const getKey = (key: DoublePageBehavior) => `${LOCALE_BASE}.options.${key}`
