import { Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function DefaultReadingSettings() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const { t } = useLocaleContext()

	return (
		<>
			<div className="flex items-center gap-2">
				<div className="flex flex-col gap-2">
					<Label>{t(getKey('imageScaling.label'))}</Label>
					<NativeSelect
						options={[
							{ label: 'Auto', value: 'auto' },
							{ label: 'Height', value: 'height' },
							{ label: 'Width', value: 'width' },
							{ label: 'Original', value: 'none' },
						]}
						{...form.register('default_reading_image_scale_fit')}
					/>
					<Text size="xs" variant="muted">
						{t(getKey('imageScaling.description'))}
					</Text>
				</div>

				<div className="flex flex-col gap-2">
					<Label>{t(getKey('readingDirection.label'))}</Label>
					<NativeSelect
						options={[
							{ label: 'Left to right', value: 'ltr' },
							{ label: 'Right to left', value: 'rtl' },
						]}
						{...form.register('default_reading_dir')}
					/>
					<Text size="xs" variant="muted">
						{t(getKey('readingDirection.description'))}
					</Text>
				</div>
			</div>

			<div className="flex flex-col gap-2 md:w-2/3">
				<Label>{t(getKey('readingMode.label'))}</Label>
				<NativeSelect
					options={[
						{ label: 'Vertical scroll', value: 'continuous:vertical' },
						{ label: 'Horizontal scroll', value: 'continuous:horizontal' },
						{ label: 'Paged', value: 'paged' },
					]}
					{...form.register('default_reading_mode')}
				/>
				<Text size="xs" variant="muted">
					{t(getKey('readingMode.description'))}
				</Text>
			</div>
		</>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.readingSettings'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
