import { NewCard } from '@stump/components'
import { useCallback, useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

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

	const { t } = useTranslate()

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
		<NewCard label={t(getKey('section.heading'))} description={t(getKey('section.description'))}>
			<NewCard.CheckboxRow
				id="convertRarToZip"
				label={t(getKey('rarToZip.label'))}
				description={t(getKey('rarToZip.description'))}
				checked={convertRarToZip}
				onClick={handleChangeConversion}
				{...form.register('convertRarToZip')}
			/>

			<NewCard.CheckboxRow
				id="hardDeleteConversions"
				label={t(getKey('deleteRarAfter.label'))}
				description={t(getKey('deleteRarAfter.description'))}
				checked={hardDeleteConversions}
				disabled={!convertRarToZip}
				onClick={handleChangeHardDelete}
				{...form.register('hardDeleteConversions')}
			/>
		</NewCard>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.convertOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
