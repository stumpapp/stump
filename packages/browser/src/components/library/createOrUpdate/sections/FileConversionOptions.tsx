import { CheckBox, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

type Props = {
	/**
	 * A callback that is triggered when the form values change, debounced by 1 second.
	 */
	onDidChange?: (
		values: Pick<CreateOrUpdateLibrarySchema, 'convertRarToZip' | 'hardDeleteConversions'>,
	) => void
}

export default function FileConversionOptions({ onDidChange }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const [convertRarToZip, hardDeleteConversions] = useWatch({
		control: form.control,
		name: ['convertRarToZip', 'hardDeleteConversions'],
	})

	const { t } = useLocaleContext()

	useEffect(() => {
		if (!convertRarToZip && hardDeleteConversions) {
			form.setValue('hardDeleteConversions', false)
		}
	}, [convertRarToZip, hardDeleteConversions, form])

	const handleChangeConversion = useCallback(() => {
		form.setValue('convertRarToZip', !convertRarToZip)
		if (onDidChange) {
			onDidChange({
				convertRarToZip: !convertRarToZip,
				hardDeleteConversions,
			})
		}
	}, [form, convertRarToZip, hardDeleteConversions, onDidChange])

	const handleChangeHardDelete = useCallback(() => {
		form.setValue('hardDeleteConversions', !hardDeleteConversions)
		if (onDidChange) {
			onDidChange({
				convertRarToZip,
				hardDeleteConversions: !hardDeleteConversions,
			})
		}
	}, [form, convertRarToZip, hardDeleteConversions, onDidChange])

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-1.5">
				<Heading size="sm">{t(getKey('section.heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('section.description'))}
				</Text>
			</div>

			<CheckBox
				id="convertRarToZip"
				variant="primary"
				label={t(getKey('rarToZip.label'))}
				description={t(getKey('rarToZip.description'))}
				checked={convertRarToZip}
				onClick={handleChangeConversion}
				{...form.register('convertRarToZip')}
			/>

			<CheckBox
				id="hardDeleteConversions"
				variant="primary"
				label={t(getKey('deleteRarAfter.label'))}
				description={t(getKey('deleteRarAfter.description'))}
				checked={hardDeleteConversions}
				disabled={!convertRarToZip}
				onClick={handleChangeHardDelete}
				{...form.register('hardDeleteConversions')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.convertOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
