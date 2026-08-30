import { ReadingImageScaleFit } from '@stump/graphql'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'

type Props = {
	behavior: ReadingImageScaleFit
	onChange: (behavior: ReadingImageScaleFit) => void
}

export default function ImageScalingSelect({ behavior, onChange }: Props) {
	const { t } = useTranslate()

	return (
		<Picker
			options={[
				{ label: t(getKey(ReadingImageScaleFit.Auto)), value: ReadingImageScaleFit.Auto },
				// TODO: support these
				// {
				// 	label: t(getKey(ReadingImageScaleFit.Height)),
				// 	value: ReadingImageScaleFit.Height,
				// },
				// {
				// 	label: t(getKey(ReadingImageScaleFit.Width)),
				// 	value: ReadingImageScaleFit.Width,
				// },
				// {
				// 	label: t(getKey(ReadingImageScaleFit.None)),
				// 	value: ReadingImageScaleFit.None,
				// },
			]}
			value={behavior}
			onValueChange={onChange}
			disabled
		/>
	)
}

const LOCALE_BASE = 'readerSettings.imageScaling'
const getKey = (key: ReadingImageScaleFit) => `${LOCALE_BASE}.options.${key}`
