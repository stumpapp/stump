import { Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function DefaultReadingSettings() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const { t } = useLocaleContext()

	return (
		<>
			<div className="gap-2 flex items-center">
				<div className="gap-2 flex flex-col">
					<Label>{t(getKey('imageScaling.label'))}</Label>
					<NativeSelect
						options={[
							{ label: t('common.auto'), value: 'AUTO' },
							{ label: t('readerUi.imageScaling.options.height'), value: 'HEIGHT' },
							{ label: t('readerUi.imageScaling.options.width'), value: 'WIDTH' },
							{ label: t('readerUi.imageScaling.options.original'), value: 'NONE' },
						]}
						{...form.register('defaultReadingImageScaleFit')}
					/>
					<Text size="xs" variant="muted">
						{t(getKey('imageScaling.description'))}
					</Text>
				</div>

				<div className="gap-2 flex flex-col">
					<Label>{t(getKey('readingDirection.label'))}</Label>
					<NativeSelect
						options={[
							{ label: t('readerUi.readingDirection.options.leftToRight'), value: 'LTR' },
							{ label: t('readerUi.readingDirection.options.rightToLeft'), value: 'RTL' },
						]}
						{...form.register('defaultReadingDir')}
					/>
					<Text size="xs" variant="muted">
						{t(getKey('readingDirection.description'))}
					</Text>
				</div>
			</div>

			<div className="gap-2 md:w-2/3 flex flex-col">
				<Label>{t(getKey('readingMode.label'))}</Label>
				<NativeSelect
					options={[
						{
							label: t('readerUi.readingMode.options.verticalScroll'),
							value: 'CONTINUOUS_VERTICAL',
						},
						{
							label: t('readerUi.readingMode.options.horizontalScroll'),
							value: 'CONTINUOUS_HORIZONTAL',
						},
						{ label: t('readerUi.readingMode.options.paged'), value: 'PAGED' },
					]}
					{...form.register('defaultReadingMode')}
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
