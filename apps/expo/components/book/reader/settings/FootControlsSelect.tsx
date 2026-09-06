import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { FooterControls } from '~/stores/reader'

type Props = {
	variant: FooterControls
	onChange: (variant: FooterControls) => void
}

export default function FooterControlsSelect({ variant, onChange }: Props) {
	const { t } = useTranslate()

	return (
		<Picker
			options={[
				{ label: t(getKey('images')), value: 'images' },
				{ label: t(getKey('slider')), value: 'slider' },
			]}
			value={variant}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'readerSettings.footerControls'
const getKey = (variant: FooterControls) => `${LOCALE_BASE}.options.${variant}`
