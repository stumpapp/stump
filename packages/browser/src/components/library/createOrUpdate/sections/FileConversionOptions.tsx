import { CheckBox, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function FileConversionOptions() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const [convertRarToZip, hardDeleteConversions] = form.watch([
		'convert_rar_to_zip',
		'hard_delete_conversions',
	])

	const { t } = useLocaleContext()

	useEffect(
		() => {
			if (!convertRarToZip && hardDeleteConversions) {
				form.setValue('hard_delete_conversions', false)
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[convertRarToZip, hardDeleteConversions],
	)

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-1.5">
				<Heading size="sm">{t(getKey('section.heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('section.description'))}
				</Text>
			</div>

			<CheckBox
				id="convert_rar_to_zip"
				variant="primary"
				label={t(getKey('rarToZip.label'))}
				description={t(getKey('rarToZip.description'))}
				checked={convertRarToZip}
				onClick={() => form.setValue('convert_rar_to_zip', !convertRarToZip)}
				{...form.register('convert_rar_to_zip')}
			/>

			<CheckBox
				id="hard_delete_conversions"
				variant="primary"
				label={t(getKey('deleteRarAfter.label'))}
				description={t(getKey('deleteRarAfter.description'))}
				checked={hardDeleteConversions}
				disabled={!convertRarToZip}
				onClick={() => form.setValue('hard_delete_conversions', !hardDeleteConversions)}
				{...form.register('hard_delete_conversions')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.convertOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
