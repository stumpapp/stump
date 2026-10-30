import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { FooterControls } from '~/stores/reader'

type Props = {
	variant: FooterControls
	onChange: (variant: FooterControls) => void
}

export default function FooterControlsSelect({ variant, onChange }: Props) {
	const { translate } = useTranslate()

	return (
		<Picker
			options={[
				{ label: translate(getKey('images')), value: 'images' },
				{ label: translate(getKey('slider')), value: 'slider' },
			]}
			value={variant}
			onValueChange={onChange}
		/>
	)
}

const LOCALE_BASE = 'shared.readerSettings.footerControls'
const getKey = (variant: FooterControls) => `${LOCALE_BASE}.options.${variant}`
