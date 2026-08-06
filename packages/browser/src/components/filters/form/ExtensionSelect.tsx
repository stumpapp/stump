import { Label, NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { MediaFilterFormSchema } from './MediaFilterForm'

export default function ExtensionSelect() {
	const { t } = useLocaleContext()
	const form = useFormContext<MediaFilterFormSchema>()

	return (
		<div className="py-1.5">
			<Label htmlFor="extension" className="mb-1.5">
				{t('controlUi.extension')}
			</Label>
			<NativeSelect
				options={[
					{ label: t('controlUi.any'), value: '' },
					{ label: 'CBZ', value: 'cbz' },
					{ label: 'CBR', value: 'cbr' },
					{ label: 'ZIP', value: 'zip' },
					{ label: 'RAR', value: 'rar' },
					{ label: 'EPUB', value: 'epub' },
					{ label: 'PDF', value: 'pdf' },
				]}
				{...form.register('extension')}
			/>
		</div>
	)
}
